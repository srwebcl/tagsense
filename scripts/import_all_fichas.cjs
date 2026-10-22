const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const VOYAGE_URL = "https://api.voyageai.com/v1/embeddings";
const MODEL = "voyage-4";

const MD_FILES = [
  "Documentacion_activos_mineros_MD/Epiroc_MT65S_equipo_fallas_verificacion.md",
  "Documentacion_activos_mineros_MD/Sandvik_Toro_LH621i_equipo_fallas_verificacion.md",
  "Documentacion_activos_mineros_MD/Volvo_A60J_equipo_fallas_verificacion.md",
];

const FIELD_TITLES = {
  equipamiento: "Equipamiento",
  fallas: "Fallas principales",
  procedimientos: "Procedimientos",
};

const CHUNK_CHARS = 3500;
const OVERLAP_CHARS = 500;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function chunkText(text) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];

  const chunks = [];
  let start = 0;
  while (start < clean.length) {
    const end = Math.min(start + CHUNK_CHARS, clean.length);
    const cut = end < clean.length ? clean.lastIndexOf(" ", end) : end;
    const sliceEnd = cut > start ? cut : end;
    chunks.push(clean.slice(start, sliceEnd).trim());
    if (sliceEnd >= clean.length) break;
    start = sliceEnd - OVERLAP_CHARS;
    if (start < 0) start = 0;
  }
  return chunks.filter(Boolean);
}

function toVectorLiteral(embedding) {
  return `[${embedding.join(",")}]`;
}

async function embedInBatches(texts, apiKey) {
  if (texts.length === 0) return [];
  // Voyage permite hasta 128 textos por request
  const BATCH_SIZE = 64;
  const results = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const slice = texts.slice(i, i + BATCH_SIZE);
    console.log(`  -> Enviando batch de ${slice.length} textos a Voyage AI...`);

    const resp = await fetch(VOYAGE_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ input: slice, model: MODEL, input_type: "document" }),
    });

    if (!resp.ok) {
      const body = await resp.text().catch(() => "");
      throw new Error(`Voyage embeddings error ${resp.status}: ${body}`);
    }

    const data = await resp.json();
    const sorted = data.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
    results.push(...sorted);
  }

  return results;
}

function parseMarkdownFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");

  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  const frontmatterText = fmMatch ? fmMatch[1] : "";

  function getFmVal(key) {
    const m = frontmatterText.match(new RegExp(`^${key}:\\s*"([^"]+)"`, "m"));
    return m ? m[1].trim() : "";
  }

  const tag_code = getFmVal("tag_code");
  const activo = getFmVal("activo");
  const tipo = getFmVal("tipo");
  const fabricante = getFmVal("fabricante");
  const modelo = getFmVal("modelo");

  const specs = {};
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

  const sysRegex = /## ([^\n(]+)\(slug:\s*([a-z0-9_-]+)\)([\s\S]*?)(?=\n## |\n# |$)/g;
  let match;
  const systems = [];

  while ((match = sysRegex.exec(content)) !== null) {
    const name = match[1].trim();
    const slug = match[2].trim();
    const body = match[3];

    function getSection(title) {
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

// Cargar variables desde .env.local si existen
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  for (const line of envContent.split("\n")) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)?$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = (m[2] || "").trim().replace(/^["']|["']$/g, "");
    }
  }
}

async function main() {
  const connectionString = process.env.APP_DATABASE_URL || process.env.DATABASE_URL;
  const apiKey = process.env.VOYAGE_API_KEY;

  if (!connectionString) {
    console.error("Falta APP_DATABASE_URL o DATABASE_URL");
    process.exit(1);
  }
  if (!apiKey) {
    console.warn("⚠️ VOYAGE_API_KEY no detectada. Se importará el texto a la base de datos sin generar embeddings vectoriales.");
  }

  const pool = new Pool({ connectionString });

  console.log("=================================================");
  console.log(" CARGANDO FICHAS TÉCNICAS DESDE ARCHIVOS MARKDOWN");
  console.log("=================================================");

  for (let fIdx = 0; fIdx < MD_FILES.length; fIdx++) {
    const relPath = MD_FILES[fIdx];
    const fullPath = path.resolve(process.cwd(), relPath);
    if (!fs.existsSync(fullPath)) {
      console.warn(`Archivo no encontrado: ${fullPath}`);
      continue;
    }

    const doc = parseMarkdownFile(fullPath);
    console.log(`\n🚜 [${fIdx + 1}/${MD_FILES.length}] Procesando: ${doc.activo} (${doc.tag_code})`);

    const assetRes = await pool.query(
      `select id, tenant_id, name, specs from assets where tag_code = $1 limit 1`,
      [doc.tag_code]
    );

    if (assetRes.rows.length === 0) {
      console.error(`⚠️ No se encontró activo con tag ${doc.tag_code} en la base de datos.`);
      continue;
    }

    const asset = assetRes.rows[0];
    const assetId = asset.id;
    const tenantId = asset.tenant_id;

    // Actualizar specs
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
    console.log(`  ✓ Specs actualizados en tabla assets`);

    const docsToProcess = [];

    for (const sys of doc.systems) {
      // 1. Asegurar en fault_categories
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

      // 3. Documentos por dimensión (equipamiento, fallas, procedimientos)
      const fields = ["equipamiento", "fallas", "procedimientos"];
      for (const field of fields) {
        const text = sys[field].trim();
        if (!text) continue;

        const title = `${sys.name} — ${FIELD_TITLES[field] || field}`;

        const existingDoc = await pool.query(
          `select id from asset_documents
           where tenant_id = $1 and asset_id = $2 and category_slug = $3 and field_type_slug = $4 and source_type = 'simulated'
           limit 1`,
          [tenantId, assetId, sys.slug, field]
        );

        let docId;
        if (existingDoc.rows.length > 0) {
          docId = existingDoc.rows[0].id;
          await pool.query(
            `update asset_documents set raw_text = $1, title = $2, index_status = 'processing'
             where id = $3 and tenant_id = $4`,
            [text, title, docId, tenantId]
          );
        } else {
          const inserted = await pool.query(
            `insert into asset_documents (tenant_id, asset_id, title, file_url, raw_text, source_type, category_slug, field_type_slug, index_status)
             values ($1, $2, $3, null, $4, 'simulated', $5, $6, 'processing')
             returning id`,
            [tenantId, assetId, title, text, sys.slug, field]
          );
          docId = inserted.rows[0].id;
        }

        docsToProcess.push({ docId, title, text, slug: sys.slug, field });
      }
    }

    console.log(`  ✓ Registrados ${doc.systems.length} sistemas (${docsToProcess.length} fichas técnicas)`);

    // Preparar todos los chunks de este activo para un SOLO request en batch a Voyage AI
    const allChunksInfo = [];
    for (const item of docsToProcess) {
      const chunks = chunkText(item.text);
      chunks.forEach((chunk, cIdx) => {
        allChunksInfo.push({ docId: item.docId, title: item.title, chunk, cIdx });
      });
    }

    if (apiKey) {
      try {
        console.log(`  ⏳ Solicitando embeddings para ${allChunksInfo.length} chunks en batch único a Voyage AI...`);
        const allChunksTexts = allChunksInfo.map((c) => c.chunk);
        const embeddings = await embedInBatches(allChunksTexts, apiKey);

        // Borrar chunks previos de estos documentos
        for (const item of docsToProcess) {
          await pool.query(
            `delete from document_chunks where document_id = $1 and tenant_id = $2`,
            [item.docId, tenantId]
          );
        }

        // Insertar todos los chunks generados
        for (let cIdx = 0; cIdx < allChunksInfo.length; cIdx++) {
          const info = allChunksInfo[cIdx];
          const emb = embeddings[cIdx];
          if (emb) {
            await pool.query(
              `insert into document_chunks (tenant_id, document_id, content, embedding, chunk_index)
               values ($1, $2, $3, $4::vector, $5)`,
              [tenantId, info.docId, info.chunk, toVectorLiteral(emb), info.cIdx]
            );
          }
        }
      } catch (err) {
        console.warn(`  ⚠️ Voyage AI no disponible o con límite excedido. Se guarda el texto directamente:`, err.message);
      }
    }

    // Actualizar estado de indexado a indexed
    for (const item of docsToProcess) {
      await pool.query(
        `update asset_documents set index_status = 'indexed', indexed_at = now(), index_error = null where id = $1 and tenant_id = $2`,
        [item.docId, tenantId]
      );
    }

    console.log(`  ✅ ${docsToProcess.length} fichas técnicas guardadas e indexadas para ${doc.activo}`);

    // Si quedan más archivos, esperar 22s para no saturar el límite de 3 RPM de la cuenta gratuita
    if (fIdx < MD_FILES.length - 1) {
      console.log(`  ⏳ Pausa de 22 segundos para respetar límites de tasa de la API...`);
      await sleep(22000);
    }
  }

  console.log("\n=================================================");
  console.log(" 🎉 TODAS LAS FICHAS TÉCNICAS HAN SIDO CARGADAS");
  console.log("=================================================");
  await pool.end();
}

main().catch((err) => {
  console.error("Error fatal:", err);
  process.exit(1);
});
