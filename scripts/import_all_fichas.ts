import fs from "fs";
import path from "path";
import { pool } from "../lib/db";
import { indexSimulatedText } from "../lib/indexing";

const MD_FILES = [
  "Documentacion_activos_mineros_MD/Epiroc_MT65S_equipo_fallas_verificacion.md",
  "Documentacion_activos_mineros_MD/Sandvik_Toro_LH621i_equipo_fallas_verificacion.md",
  "Documentacion_activos_mineros_MD/Volvo_A60J_equipo_fallas_verificacion.md",
];

const FIELD_TITLES: Record<string, string> = {
  equipamiento: "Equipamiento",
  fallas: "Fallas principales",
  procedimientos: "Procedimientos",
};

interface ParsedSystem {
  name: string;
  slug: string;
  equipamiento: string;
  fallas: string;
  procedimientos: string;
}

interface ParsedDoc {
  tag_code: string;
  activo: string;
  tipo: string;
  fabricante: string;
  modelo: string;
  specs: Record<string, string>;
  systems: ParsedSystem[];
}

function parseMarkdownFile(filePath: string): ParsedDoc {
  const content = fs.readFileSync(filePath, "utf8");

  // Extract frontmatter
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  const frontmatterText = fmMatch ? fmMatch[1] : "";

  function getFmVal(key: string): string {
    const m = frontmatterText.match(new RegExp(`^${key}:\\s*"([^"]+)"`, "m"));
    return m ? m[1].trim() : "";
  }

  const tag_code = getFmVal("tag_code");
  const activo = getFmVal("activo");
  const tipo = getFmVal("tipo");
  const fabricante = getFmVal("fabricante");
  const modelo = getFmVal("modelo");

  // Specs
  const specs: Record<string, string> = {};
  const specsSection = frontmatterText.match(/specs_generales:\n([\s\S]*?)(?=\n[a-z_]+:|$)/);
  if (specsSection) {
    const lines = specsSection[1].split("\n");
    for (const l of lines) {
      const specMatch = l.match(/^\s*([a-z_]+):\s*"([^"]+)"/);
      if (specMatch) {
        specs[specMatch[1]] = specMatch[2];
      }
    }
  }

  // Parse systems
  const sysRegex = /## ([^\n(]+)\(slug:\s*([a-z0-9_-]+)\)([\s\S]*?)(?=\n## |\n# |$)/g;
  let match: RegExpExecArray | null;
  const systems: ParsedSystem[] = [];

  while ((match = sysRegex.exec(content)) !== null) {
    const name = match[1].trim();
    const slug = match[2].trim();
    const body = match[3];

    function getSection(title: string): string {
      const r = new RegExp("### " + title + "([\\s\\S]*?)(?=\\n### |$)", "i");
      const m = body.match(r);
      if (!m) return "";
      return m[1]
        .trim()
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.startsWith("•"))
        .join("\n");
    }

    systems.push({
      name,
      slug,
      equipamiento: getSection("Equipamiento"),
      fallas: getSection("Fallas"),
      procedimientos: getSection("Procedimientos"),
    });
  }

  return { tag_code, activo, tipo, fabricante, modelo, specs, systems };
}

async function run() {
  console.log("=== INICIANDO IMPORTACIÓN DE FICHAS TÉCNICAS ===");

  for (const relativePath of MD_FILES) {
    const fullPath = path.resolve(process.cwd(), relativePath);
    if (!fs.existsSync(fullPath)) {
      console.error(`Archivo no encontrado: ${fullPath}`);
      continue;
    }

    const doc = parseMarkdownFile(fullPath);
    console.log(`\n📄 Procesando ${relativePath} (Tag: ${doc.tag_code}, Activo: ${doc.activo})...`);

    // Buscar activo en BD
    const assetRes = await pool.query(
      `select id, tenant_id, name, specs from assets where tag_code = $1 limit 1`,
      [doc.tag_code]
    );

    if (assetRes.rows.length === 0) {
      console.error(`⚠️ Activo con tag_code ${doc.tag_code} no existe en la BD.`);
      continue;
    }

    const asset = assetRes.rows[0];
    const assetId = asset.id;
    const tenantId = asset.tenant_id;

    // Actualizar specs generales en assets
    const currentSpecs = asset.specs || {};
    const updatedSpecs = {
      ...currentSpecs,
      ...(doc.specs.motor ? { engine_type: doc.specs.motor } : {}),
      ...(doc.specs.potencia && !doc.specs.potencia.includes("Ver detalle") ? { power: doc.specs.potencia } : {}),
      ...(doc.specs.capacidad_nominal ? { load_capacity: doc.specs.capacidad_nominal } : {}),
      ...(doc.specs.transmision ? { transmission: doc.specs.transmision } : {}),
      ...(doc.specs.sistema_electrico ? { electrical_system: doc.specs.sistema_electrico } : {}),
    };

    await pool.query(
      `update assets set specs = $1, manufacturer = coalesce(manufacturer, $2), model = coalesce(model, $3) where id = $4 and tenant_id = $5`,
      [JSON.stringify(updatedSpecs), doc.fabricante, doc.modelo, assetId, tenantId]
    );
    console.log(`✓ Specs de activo actualizados para ${doc.tag_code}`);

    const docsToIndex: string[] = [];

    for (const sys of doc.systems) {
      // 1. Asegurar categoría en fault_categories
      await pool.query(
        `insert into fault_categories (tenant_id, slug, name)
         values ($1, $2, $3)
         on conflict (tenant_id, slug) do update set name = excluded.name`,
        [tenantId, sys.slug, sys.name]
      );

      // 2. Asociar componente al activo en asset_components
      await pool.query(
        `insert into asset_components (tenant_id, asset_id, category_slug)
         values ($1, $2, $3)
         on conflict (asset_id, category_slug) do nothing`,
        [tenantId, assetId, sys.slug]
      );

      // 3. Procesar los 3 campos: equipamiento, fallas, procedimientos
      const fields: Array<"equipamiento" | "fallas" | "procedimientos"> = [
        "equipamiento",
        "fallas",
        "procedimientos",
      ];

      for (const field of fields) {
        const text = sys[field].trim();
        if (!text) continue;

        const title = `${sys.name} — ${FIELD_TITLES[field] || field}`;

        // Verificar si ya existe documento
        const existingDocRes = await pool.query(
          `select id from asset_documents
           where tenant_id = $1 and asset_id = $2 and category_slug = $3 and field_type_slug = $4 and source_type = 'simulated'
           limit 1`,
          [tenantId, assetId, sys.slug, field]
        );

        let docId: string;
        if (existingDocRes.rows.length > 0) {
          docId = existingDocRes.rows[0].id;
          await pool.query(
            `update asset_documents
             set raw_text = $1, title = $2, index_status = 'processing'
             where id = $3 and tenant_id = $4`,
            [text, title, docId, tenantId]
          );
        } else {
          const insertRes = await pool.query(
            `insert into asset_documents (tenant_id, asset_id, title, file_url, raw_text, source_type, category_slug, field_type_slug, index_status)
             values ($1, $2, $3, null, $4, 'simulated', $5, $6, 'processing')
             returning id`,
            [tenantId, assetId, title, text, sys.slug, field]
          );
          docId = insertRes.rows[0].id;
        }

        docsToIndex.push(docId);
      }
    }

    console.log(`✓ Registrados ${doc.systems.length} componentes y ${docsToIndex.length} documentos para ${doc.tag_code}`);

    // Indexar vectorialmente con Voyage AI
    console.log(`⏳ Indexando ${docsToIndex.length} celdas en Voyage AI para ${doc.tag_code}...`);
    for (let i = 0; i < docsToIndex.length; i++) {
      const dId = docsToIndex[i];
      try {
        await indexSimulatedText(dId, tenantId);
        process.stdout.write(`  [${i + 1}/${docsToIndex.length}] Indexado doc ${dId}\r`);
      } catch (err) {
        console.error(`\nError indexando doc ${dId}:`, err);
      }
    }
    console.log(`\n✅ ${docsToIndex.length} documentos indexados con éxito para ${doc.tag_code}`);
  }

  console.log("\n🎉 IMPORTACIÓN Y GENERACIÓN DE EMBEDDINGS FINALIZADA CON ÉXITO.");
  await pool.end();
}

run().catch((err) => {
  console.error("Error fatal en importación:", err);
  process.exit(1);
});
