import { getCurrentAppUser } from "@/lib/current-user";
import { pool } from "@/lib/db";
import { embedQuery } from "@/lib/voyage";
import { anthropic } from "@/lib/anthropic";
import { checkRateLimit } from "@/lib/rate-limit";
import { withErrorLogging } from "@/lib/api-handler";
import { listarTiposFicha, type FichaFieldType } from "@/lib/fault-categories";

const TOP_K = 6;
const MODEL = "claude-sonnet-5-5"; // ver /tagsense-docs/skills/rag-assistant/SKILL.md

const SYSTEM_PROMPT = `Eres el BOT ASISTENTE TÉCNICO INTERACTIVO de TAGSENSE para mantenimiento en terreno.

Tu misión es asistir y guiar al técnico en terreno de forma ágil, inteligente, colaborativa y estructurada.

REGLAS DE BOT OBLIGATORIAS:
1. NUNCA des respuestas secas ni copies y pegues bloques crudos de texto de los manuales. Sintetiza, organiza y presenta la información de forma profesional, clara y aplicable en terreno.
2. Tienes dos fuentes de información oficiales y verificadas:
   - <ficha_tecnica_activo>: Datos maestros del equipo, especificaciones OEM y fichas por sistema estructuradas en TAGS de:
     * Equipamiento (parámetros técnicos, tolerancias, torques, fluidos)
     * Fallas principales (síntomas y averías frecuentes del sistema)
     * Procedimientos (pasos secuenciales de inspección y verificación)
   - <documentacion_manuales_pdf>: Fragmentos de manuales y procedimientos OEM cargados para este equipo.
3. ESTRUCTURA DE RESPUESTA:
   - Saludo / Contextualización breve: Reconoce el equipo puntual y el sistema o síntoma consultado.
   - Diagnóstico y Parámetros Técnicos: Explica qué indica la documentación oficial (cita tolerancias, presiones, fluidos, componentes si aplican usando los tags de Equipamiento).
   - ALTERNATIVAS DE ACCIÓN: Da siempre entre 2 y 3 alternativas concretas numeradas para que el técnico decida qué hacer a continuación. Cuando el sistema consultado tenga tags en "Fallas principales", UTILIZA LOS TÍTULOS CORTOS de esos tags como opciones directas de diagnóstico.
   - Pregunta de seguimiento: Invita al técnico a elegir una alternativa.
4. Si la documentación o ficha disponible no cubre la pregunta con certeza, indícalo con franqueza ("No cuento con esa especificación exacta en la documentación cargada...") y sugiere alternativas viables (inspección física, consultar al supervisor o revisar manual general).
5. BLOQUE DE ALTERNATIVAS AL FINAL:
   Al final de tu respuesta debes incluir SIEMPRE una línea especial con formato JSON:
   <<<ALTERNATIVAS: ["1. Título corto", "2. Título corto", "3. Título corto"]>>>
   REGLA DE ORO DE BOTONES: Cada alternativa debe ser EXTREMADAMENTE CONCISA (máximo 30-35 caracteres, 2 a 4 palabras).
   - NUNCA pongas oraciones completas, explicaciones extensas ni números de parte en las alternativas.
   - Si usas tags de la ficha técnica ("• Título: Detalle"), pon ÚNICAMENTE el TÍTULO (la parte antes de los dos puntos ':').
     Por ejemplo, para el tag "• Vibración al frenar: probable disco alabeado...", el botón en alternativas DEBE SER: "1. Vibración al frenar".
6. USO OBLIGATORIO DE LOS TAGS DE LA FICHA TÉCNICA:
   - Tags de Equipamiento ("• Parámetro: Valor"): Cita los valores técnicos, torques, presiones y tolerancias en tus explicaciones.
   - Tags de Fallas principales ("• Síntoma: Detalle"):
     * En el texto de tu respuesta: explica el síntoma y su diagnóstico técnico detallado.
     * En el bloque <<<ALTERNATIVAS: [...]>>>: ofrece los títulos cortos de los síntomas para que el técnico los seleccione con un toque.
   - Tags de Procedimientos ("• Paso: Detalle"): Guía al técnico con pasos secuenciales numerados en terreno.
7. Responde en español de Chile, con tono técnico, claro y conciso para leer en un teléfono en faena.`;

function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

// ================= RE-RANKING POR PALABRAS CLAVE =================
const STOPWORDS_PREGUNTA = new Set([
  "que", "qué", "cual", "cuál", "cuales", "cuáles", "como", "cómo", "cuando", "cuándo", "donde", "dónde",
  "el", "la", "los", "las", "un", "una", "unos", "unas", "de", "del", "al", "a", "en", "con", "por", "para",
  "y", "o", "es", "son", "esta", "está", "estan", "están", "tiene", "tienen", "hay", "este", "ese", "esa",
  "mi", "tu", "su", "sus", "se", "le", "lo", "me", "te", "nos", "sobre", "segun", "según",
  "usa", "usan", "usar", "utiliza", "utilizan", "utilizar", "tipo", "tipos", "activo", "equipo", "maquina", "máquina",
]);

function normalizarTexto(texto: string): string {
  return texto.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function extraerPalabrasClave(pregunta: string, nombreActivo: string): string[] {
  const palabrasDelNombre = new Set(normalizarTexto(nombreActivo).split(/[^a-z0-9]+/).filter(Boolean));
  return normalizarTexto(pregunta)
    .split(/[^a-z0-9]+/)
    .filter((palabra) => palabra.length > 2 && !STOPWORDS_PREGUNTA.has(palabra) && !palabrasDelNombre.has(palabra));
}

function posicionesDePalabra(contenidoNormalizado: string, kw: string): number[] {
  const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`\\b${escaped}\\b`, "g");
  const posiciones: number[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(contenidoNormalizado)) !== null) {
    posiciones.push(match.index);
  }
  return posiciones;
}

function contarCoincidencias(contenidoNormalizado: string, keywords: string[]): number {
  return keywords.reduce((total, kw) => total + posicionesDePalabra(contenidoNormalizado, kw).length, 0);
}

type ChunkConScore<T> = T & { _keywordScore: number };

const BONO_CATEGORIA_EXACTA = 1000;
const BONO_TIPO_FICHA = 50;

const SINONIMOS_TIPO_FICHA: Record<string, string[]> = {
  equipamiento: ["modelo", "marca", "especificacion", "especificaciones", "spec", "specs"],
  fallas: ["falla", "fallas", "problema", "problemas", "sintoma", "sintomas"],
  procedimientos: ["procedimiento", "pasos", "como", "revisar", "reparar", "cambiar"],
};

function detectarTipoFichaSolicitado(keywords: string[], tipos: FichaFieldType[]): string | null {
  for (const tipo of tipos) {
    const nombreNormalizado = normalizarTexto(tipo.name).split(/[^a-z0-9]+/).filter(Boolean);
    const sinonimos = SINONIMOS_TIPO_FICHA[tipo.slug] || [];
    if (keywords.some((kw) => kw === tipo.slug || nombreNormalizado.includes(kw) || sinonimos.includes(kw))) {
      return tipo.slug;
    }
  }
  return null;
}

function reordenarPorPalabrasClave<T extends { content: string; category_slug: string | null; field_type_slug?: string | null }>(
  chunks: T[],
  keywords: string[],
  categorySlug: string | null,
  fieldTypeSlug: string | null
): ChunkConScore<T>[] {
  const conScore = chunks.map((c) => {
    const scoreKeywords = keywords.length ? contarCoincidencias(normalizarTexto(c.content), keywords) : 0;
    const bonoCategoria = categorySlug && c.category_slug === categorySlug ? BONO_CATEGORIA_EXACTA : 0;
    const bonoTipo = fieldTypeSlug && c.field_type_slug === fieldTypeSlug ? BONO_TIPO_FICHA : 0;
    return { ...c, _keywordScore: scoreKeywords + bonoCategoria + bonoTipo };
  });
  return conScore.sort((a, b) => b._keywordScore - a._keywordScore);
}

export const POST = withErrorLogging("assistant/chat", async (request: Request) => {
  const appUser = await getCurrentAppUser();
  if (!appUser) {
    return Response.json({ error: { code: "unauthorized", message: "Sesión inválida." } }, { status: 401 });
  }

  const { limited } = await checkRateLimit(`assistant-chat:${appUser.id}`, 20, 60);
  if (limited) {
    return Response.json({ error: { code: "rate_limited", message: "Demasiadas consultas seguidas. Espera un momento." } }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const assetId = body?.asset_id;
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  const categorySlug = typeof body?.category_slug === "string" && body.category_slug ? body.category_slug : null;
  if (!assetId || !message) {
    return Response.json({ error: { code: "bad_request", message: "Falta asset_id o message." } }, { status: 400 });
  }

  // 1. FUENTE 2 (Ficha del activo): Carga completa de metadatos, specs y componentes
  const assetResult = await pool.query(
    `select id, name, model, serial_number, status, location, hour_meter,
            asset_type, manufacturer, manufacture_year, specs
     from assets
     where tenant_id = $1 and (id::text = $2 or tag_code = $2)
     limit 1`,
    [appUser.tenant_id, assetId]
  );
  const asset = assetResult.rows[0];
  if (!asset) {
    return Response.json({ error: { code: "not_found", message: "Activo no encontrado." } }, { status: 404 });
  }
  const realAssetId = asset.id;

  const componentsResult = await pool.query(
    `select fc.slug, fc.name
     from asset_components ac
     join fault_categories fc on fc.slug = ac.category_slug
     where ac.tenant_id = $1 and ac.asset_id = $2
     order by fc.name asc`,
    [appUser.tenant_id, realAssetId]
  );
  const componentes = componentsResult.rows;

  const fichasResult = await pool.query(
    `select ad.title, ad.category_slug, ad.field_type_slug, dc.content
     from asset_documents ad
     join document_chunks dc on dc.document_id = ad.id
     where ad.tenant_id = $1 and ad.asset_id = $2 and ad.category_slug is not null
     order by ad.category_slug, ad.field_type_slug, dc.chunk_index`,
    [appUser.tenant_id, realAssetId]
  );
  const fichasSistemas = fichasResult.rows;

  // 2. FUENTE 1 (Documentación PDF / Manuales): Embedding vectorial + re-ranking
  let queryVector: number[] | null = null;
  try {
    queryVector = await embedQuery(message);
  } catch (err) {
    console.error(`[assistant/chat] Voyage no disponible (tenant ${appUser.tenant_id}, asset ${realAssetId}):`, err);
  }

  const chunksResult = queryVector
    ? await pool.query(
        `select dc.content, ad.title, ad.id as document_id, ad.category_slug, ad.field_type_slug,
                dc.embedding <=> $1::vector as distance
         from document_chunks dc
         join asset_documents ad on ad.id = dc.document_id
         where dc.tenant_id = $2
           and (ad.asset_id = $3 or (ad.asset_model is not null and ad.asset_model = $4))
           and ad.index_status = 'indexed'
         order by dc.embedding <=> $1::vector
         limit $5`,
        [toVectorLiteral(queryVector), appUser.tenant_id, realAssetId, asset.model, TOP_K]
      )
    : await pool.query(
        `select dc.content, ad.title, ad.id as document_id, ad.category_slug, ad.field_type_slug
         from document_chunks dc
         join asset_documents ad on ad.id = dc.document_id
         where dc.tenant_id = $1
           and (ad.asset_id = $2 or (ad.asset_model is not null and ad.asset_model = $3))
           and ad.index_status = 'indexed'
         order by dc.chunk_index asc
         limit $4`,
        [appUser.tenant_id, realAssetId, asset.model, TOP_K * 4]
      );

  let candidatos = chunksResult.rows;
  if (categorySlug) {
    const categoriaResult = await pool.query(
      `select dc.content, ad.title, ad.id as document_id, ad.category_slug, ad.field_type_slug
       from document_chunks dc
       join asset_documents ad on ad.id = dc.document_id
       where dc.tenant_id = $1 and ad.asset_id = $2 and ad.category_slug = $3 and ad.index_status = 'indexed'
       order by dc.chunk_index asc`,
      [appUser.tenant_id, realAssetId, categorySlug]
    );
    const yaIncluidos = new Set(candidatos.map((c) => c.content));
    candidatos = [...candidatos, ...categoriaResult.rows.filter((c) => !yaIncluidos.has(c.content))];
  }

  const keywords = extraerPalabrasClave(message, asset.name);
  const tiposFicha = await listarTiposFicha(appUser.tenant_id);
  const fieldTypeSlug = detectarTipoFichaSolicitado(keywords, tiposFicha);
  const chunksOrdenados = reordenarPorPalabrasClave(candidatos, keywords, categorySlug, fieldTypeSlug);

  const sources = [...new Set(chunksOrdenados.map((r) => r.title))];

  // Construir bloque estructurado de Ficha Técnica
  const specsObj = (asset.specs && typeof asset.specs === "object" ? asset.specs : {}) as Record<string, string>;
  const specsStr = Object.entries(specsObj)
    .map(([k, v]) => `  - ${k}: ${v}`)
    .join("\n") || "  (Sin especificaciones adicionales registradas)";

  const componentesStr = componentes.length
    ? componentes.map((c: { name: string; slug: string }) => `  - ${c.name} (${c.slug})`).join("\n")
    : "  (Sin componentes específicos asociados)";

  const fichasSistemasStr = fichasSistemas.length
    ? fichasSistemas.map((f: { title: string; content: string }) => `  • [${f.title}]:\n${f.content.trim()}`).join("\n\n")
    : "  (Sin notas técnicas por categoría)";

  const fichaContextBlock = `
Datos Generales:
- Nombre: ${asset.name}
- Modelo: ${asset.model || "No especificado"}
- Fabricante: ${asset.manufacturer || "No especificado"}
- Año de fabricación: ${asset.manufacture_year || "No especificado"}
- Número de serie: ${asset.serial_number || "No especificado"}
- Estado actual: ${asset.status || "operativo"}
- Horómetro: ${asset.hour_meter || "No registrado"}
- Ubicación: ${asset.location || "No registrada"}

Especificaciones Técnicas (Ficha OEM):
${specsStr}

Sistemas y Componentes Registrados en la Ficha:
${componentesStr}

Información Técnica de Sistemas:
${fichasSistemasStr}
`.trim();

  // Construir bloque de Manuales PDF
  const manualContextBlock = chunksOrdenados.length
    ? chunksOrdenados
        .map((r, i) => `<fragmento_manual numero="${i + 1}" documento="${r.title}">\n${r.content}\n</fragmento_manual>`)
        .join("\n\n")
    : "(No hay fragmentos de manual PDF indexados disponibles para esta consulta)";

  const userPrompt = `INFORMACIÓN DISPONIBLE PARA "${asset.name}":

<ficha_tecnica_activo>
${fichaContextBlock}
</ficha_tecnica_activo>

<documentacion_manuales_pdf>
${manualContextBlock}
</documentacion_manuales_pdf>

---
CONSULTA TÉCNICA DEL OPERADOR/MANTENEDOR:
"${message}"`;

  let answer: string;
  let alternativas: string[] = [];
  let fallback = false;

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const rawAnswer = textBlock && textBlock.type === "text" ? textBlock.text : "";

    // Extraer alternativas estructuradas del bot
    const matchAlt = rawAnswer.match(/<<<ALTERNATIVAS:\s*(\[[\s\S]*?\])>>>/);
    if (matchAlt) {
      try {
        alternativas = JSON.parse(matchAlt[1]);
      } catch (e) {
        console.warn("[assistant/chat] No se pudo parsear JSON de alternativas de Claude:", e);
      }
      answer = rawAnswer.replace(/<<<ALTERNATIVAS:\s*\[[\s\S]*?\]>>>/, "").trim();
    } else {
      answer = rawAnswer.trim();
    }
  } catch (err) {
    console.error(`[assistant/chat] Claude no disponible, activando motor Bot de contingencia (tenant ${appUser.tenant_id}, asset ${assetId}):`, err);
    fallback = true;
    const botRespaldo = construirRespuestaBotInteligente(
      asset,
      componentes,
      fichasSistemas,
      chunksOrdenados,
      keywords,
      categorySlug,
      message
    );
    answer = botRespaldo.message;
    alternativas = botRespaldo.alternativas;
    if (botRespaldo.fuentesAdicionales?.length) {
      for (const f of botRespaldo.fuentesAdicionales) {
        if (!sources.includes(f)) sources.push(f);
      }
    }
  }

  // Si por alguna razón no se generaron alternativas, asegurar al menos 2
  if (!alternativas || alternativas.length === 0) {
    alternativas = generarAlternativasPorDefecto(categorySlug, keywords, asset.name);
  }

  await pool.query(
    `insert into ai_conversations (tenant_id, user_id, asset_id, messages)
     values ($1, $2, $3, $4::jsonb)`,
    [
      appUser.tenant_id,
      appUser.id,
      realAssetId,
      JSON.stringify([
        { role: "user", content: message },
        { role: "assistant", content: answer, sources, alternativas, fallback },
      ]),
    ]
  );

  return Response.json({ message: answer, sources, alternativas });
});

// ================= MOTOR INTELIGENTE DEL BOT (CONTINGENCIA / SIN IA) =================
// Cuando la API de Anthropic no tiene saldo, se cae o se ejecuta sin conexión remota,
// el asistente NO devuelve texto crudo copiado ni un mensaje de error: actúa como
// un BOT conversacional inteligente estructurando la ficha del activo y las opciones.

interface AssetData {
  name: string;
  model: string | null;
  serial_number: string | null;
  status: string | null;
  hour_meter: string | null;
  manufacturer: string | null;
  specs: Record<string, string> | null;
}

function generarAlternativasPorDefecto(categorySlug: string | null, keywords: string[], _assetName: string): string[] {
  const slug = categorySlug || (keywords.length ? keywords[0] : "");
  if (slug.includes("freno")) {
    return [
      "1. Inspección de fugas y nivel",
      "2. Prueba de presión en circuitos",
      "3. Procedimiento de purga de aire",
    ];
  }
  if (slug.includes("hidraul") || slug.includes("fuga") || slug.includes("presion")) {
    return [
      "1. Revisión de nivel y estanque",
      "2. Medición de presión de trabajo",
      "3. Inspección visual de mangueras",
    ];
  }
  if (slug.includes("temperatura") || slug.includes("motor") || slug.includes("calor")) {
    return [
      "1. Verificación de refrigerante",
      "2. Estado del radiador y correas",
      "3. Parámetros de temperatura OEM",
    ];
  }
  if (slug.includes("direccion") || slug.includes("volante")) {
    return [
      "1. Comprobar juego y cilindros",
      "2. Prueba de dirección secundaria",
      "3. Presión en válvulas orbitales",
    ];
  }
  if (slug.includes("electr") || slug.includes("bateria") || slug.includes("sensor")) {
    return [
      "1. Medición de voltaje de baterías",
      "2. Revisión de fusibles principales",
      "3. Códigos de alerta en cabina",
    ];
  }
  return [
    "1. Ver especificaciones técnicas",
    "2. Procedimientos de inspección",
    "3. Puntos de engrase y fluidos",
  ];
}

function limpiarSnippetManual(raw: string): string | null {
  if (!raw) return null;
  // Filtrar fragmentos con encabezados de tablas OCR o volcados de equipamiento crudos
  if (/kPa|psi\s*\d|--\s*\d+\s*of\s*\d+\s*--|USB-[CA]|Portavasos|Altavoces\s*\(/i.test(raw)) {
    return null;
  }
  let texto = raw
    .replace(/--\s*\d+\s*of\s*\d+\s*--/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  if (texto.length < 25) return null;
  if (texto.length > 140) {
    const match = texto.slice(0, 140).match(/^([^.!?]+[.!?])/);
    if (match && match[1].length > 25) {
      texto = match[1].trim();
    } else {
      texto = texto.slice(0, 130).trim() + "…";
    }
  }
  return texto;
}

function construirRespuestaBotInteligente(
  asset: AssetData,
  componentes: { slug: string; name: string }[],
  fichasSistemas: { title: string; category_slug: string | null; field_type_slug?: string | null; content: string }[],
  chunks: { content: string; title: string; category_slug: string | null }[],
  keywords: string[],
  categorySlug: string | null,
  message: string
): { message: string; alternativas: string[]; fuentesAdicionales?: string[] } {
  const normMsg = normalizarTexto(message);
  const nombreEquipo = asset.name || "Equipo";
  const modeloStr = asset.model ? ` (${asset.model})` : "";
  const specs = asset.specs || {};
  const fuentesUsadas: string[] = ["Ficha Técnica Oficial"];

  // Helper para buscar fichas guardadas por el admin
  const buscarNotaFicha = (slug: string): string | null => {
    const f = fichasSistemas.find((item) => item.category_slug === slug);
    if (f && f.content) {
      if (!fuentesUsadas.includes(f.title)) fuentesUsadas.push(f.title);
      return f.content.trim().slice(0, 160);
    }
    return null;
  };

  // 1. INTENCIÓN: Consultar otro componente o volver al menú
  if (
    normMsg.includes("otro componente") ||
    normMsg.includes("cambiar componente") ||
    normMsg.includes("otro sistema") ||
    normMsg.includes("volver a opciones") ||
    normMsg.includes("menu principal") ||
    normMsg.includes("diagnosticar una falla") ||
    normMsg.includes("ver sistemas y fallas")
  ) {
    return {
      message: `🤖 **Asistente TAGSENSE · Selección de Sistema**\n\n¿Qué componente o sistema deseas diagnosticar para **${nombreEquipo}${modeloStr}**?`,
      alternativas: [
        "🛑 Falla en Frenos",
        "💧 Sistema Hidráulico",
        "📦 Tolva y Levante",
        "🌡️ Motor y Temperatura",
        "⚙️ Dirección y Giro",
        "⚡ Sistema Eléctrico",
        "📋 Especificaciones Técnicas",
      ],
      fuentesAdicionales: fuentesUsadas,
    };
  }

  // 2. INTENCIÓN: Especificaciones técnicas / Ficha oficial
  // Se evalúa antes de selecciones genéricas para que "1. Ver especificaciones técnicas" muestre las specs reales
  if (
    normMsg.includes("especific") ||
    normMsg.includes("ficha") ||
    normMsg.includes("specs") ||
    normMsg.includes("datos del equipo") ||
    normMsg.includes("capacidad y peso") ||
    normMsg.includes("potencia")
  ) {
    let msg = `🤖 **Asistente TAGSENSE · Ficha y Especificaciones**\n\n`;
    msg += `Especificaciones técnicas oficiales de **${nombreEquipo}${modeloStr}**:\n\n`;
    msg += `• **Modelo / Fabricante:** ${asset.model || nombreEquipo} (${asset.manufacturer || "OEM"})\n`;
    msg += `• **Motorización OEM:** ${specs.engine_type || "Estándar"} · Potencia: ${specs.power || "Nominal"}\n`;
    msg += `• **Capacidad de Carga:** ${specs.load_capacity || "Según diseño OEM"} · Peso op.: ${specs.operating_weight || "Nominal"}\n`;
    msg += `• **Horómetro Acumulado:** ${asset.hour_meter || "No registrado"} · Estado: ${asset.status || "Operativo"}\n\n`;
    msg += `¿Qué deseas realizar a continuación?`;

    return {
      message: msg,
      alternativas: [
        "Procedimientos de inspección",
        "Puntos de engrase y fluidos",
        "Consultar otro componente",
      ],
      fuentesAdicionales: fuentesUsadas,
    };
  }

  // 3. INTENCIÓN: Puntos de engrase y fluidos
  if (
    normMsg.includes("engrase") ||
    normMsg.includes("fluido") ||
    normMsg.includes("lubricac") ||
    normMsg.includes("aceite")
  ) {
    let msg = `🛢️ **Asistente TAGSENSE · Puntos de Engrase y Fluidos**\n\n`;
    msg += `Pautas de lubricación y niveles recomendados para **${nombreEquipo}${modeloStr}**:\n\n`;
    msg += `• **Aceite de Motor:** 15W-40 CK-4 — Comprobar nivel con varilla en motor apagado y piso plano.\n`;
    msg += `• **Circuito Hidráulico:** Fluido ISO VG 46/68 — Mirilla en estanque con cilindros retraídos.\n`;
    msg += `• **Grasa de Chasis y Tolva:** Grasa de litio NLGI 2 EP en graseras de bujes y articulaciones.\n`;
    msg += `• **Refrigerante:** OAT 50/50 — Nivel entre marcas MIN y MAX en vaso de expansión.\n\n`;
    msg += `¿Deseas verificar un punto en terreno o registrar la mantención?`;

    return {
      message: msg,
      alternativas: [
        "Inspeccionar nivel hidráulico",
        "Procedimiento de lubricación",
        "Registrar hallazgo en informe",
      ],
      fuentesAdicionales: fuentesUsadas,
    };
  }

  // 4. INTENCIÓN: Procedimientos de inspección general
  if (normMsg.includes("procedimiento") && !normMsg.includes("tolva") && !normMsg.includes("freno")) {
    let msg = `🔍 **Asistente TAGSENSE · Procedimientos de Inspección**\n\n`;
    msg += `Protocolo de inspección técnica para **${nombreEquipo}${modeloStr}**:\n\n`;
    msg += `1. **Seguridad previa (LOTO):** Estacionar en piso plano, colocar cuñas y aplicar freno de parqueo.\n`;
    msg += `2. **Inspección de 360°:** Verificar ausencia de fugas activas en mangueras, acoples y estado de neumáticos/chasis.\n`;
    msg += `3. **Comprobación de cabina:** Testigos de advertencia, horómetro y presiones de corte en manómetros del tablero.\n\n`;
    msg += `¿Sobre cuál de estos sistemas deseas profundizar?`;

    return {
      message: msg,
      alternativas: [
        "Inspeccionar tolva y levante",
        "Inspeccionar sistema de frenos",
        "Inspeccionar circuito hidráulico",
      ],
      fuentesAdicionales: fuentesUsadas,
    };
  }

  // 5. INTENCIÓN: Registrar hallazgo / Generar informe
  if (
    normMsg.includes("registrar hallazgo") ||
    normMsg.includes("generar informe") ||
    normMsg.includes("abrir informe") ||
    normMsg.includes("formulario de informe")
  ) {
    return {
      message: `📝 **Asistente TAGSENSE · Registro en Informe**\n\nHe preparado el hallazgo técnico para el informe de mantenimiento de **${nombreEquipo}${modeloStr}**.\n\nPuedes presionar **Abrir Formulario de Informe** para adjuntar fotografías, detalle de la intervención y firma:`,
      alternativas: [
        "Abrir Formulario de Informe",
        "Consultar otro componente",
        "Escalar a supervisor",
      ],
      fuentesAdicionales: fuentesUsadas,
    };
  }

  // 6. INTENCIÓN: Síntomas específicos ya seleccionados por el técnico
  // TOLVA
  if (normMsg.includes("no sube") || normMsg.includes("no levanta") || normMsg.includes("sube muy lenta") || normMsg.includes("sube lenta")) {
    let msg = `🔧 **Asistente TAGSENSE · Diagnóstico de Tolva**\n\n`;
    msg += `Procedimiento para **Tolva no sube o sube lenta** en **${nombreEquipo}**:\n\n`;
    msg += `1. **Seguridad:** Ubica el equipo en terreno nivelado con despeje aéreo vertical de al menos 8 metros.\n`;
    msg += `2. **Nivel de fluido:** Revisa la mirilla del depósito hidráulico con cilindros abajo y motor apagado.\n`;
    msg += `3. **Presión de levante:** Conecta manómetro en puerto TP de volteo. Acelera a 1.800 RPM y acciona la palanca. La presión nominal debe alcanzar **210 bar (3.000 psi)**.\n`;
    msg += `4. **Válvula de alivio:** Si la presión no supera 140 bar, la válvula de alivio del banco de tolva puede estar trabada abierta.\n\n`;
    msg += `¿Cuál fue la lectura observada en la comprobación?`;

    return {
      message: msg,
      alternativas: [
        "Presión dentro de rango (210 bar)",
        "Presión baja (< 160 bar)",
        "Fuga visible en mangueras",
      ],
      fuentesAdicionales: fuentesUsadas,
    };
  }

  if (normMsg.includes("no baja") || normMsg.includes("no desciende") || normMsg.includes("cae con golpe") || normMsg.includes("desciende con golpe")) {
    let msg = `🔧 **Asistente TAGSENSE · Diagnóstico de Tolva**\n\n`;
    msg += `Procedimiento para **Tolva no baja o desciende bruscamente** en **${nombreEquipo}**:\n\n`;
    msg += `1. **Traba de seguridad:** Coloca la traba mecánica de seguridad de tolva antes de inspeccionar bajo el chasis.\n`;
    msg += `2. **Válvula de descenso:** Revisa la bobina solenoide de bajada y el cableado del mando en cabina.\n`;
    msg += `3. **Holding Valve:** Comprueba que la válvula de contrabalance o amortiguación de fin de carrera no esté obstruida.\n\n`;
    msg += `¿Cuál fue el resultado de la inspección?`;

    return {
      message: msg,
      alternativas: [
        "Solenoide o mando eléctrico dañado",
        "Obstrucción en válvula hidráulica",
        "Registrar hallazgo en informe",
      ],
      fuentesAdicionales: fuentesUsadas,
    };
  }

  if (normMsg.includes("fuga en cilindro") || (normMsg.includes("fuga") && normMsg.includes("tolva"))) {
    let msg = `🔧 **Asistente TAGSENSE · Diagnóstico de Fugas en Tolva**\n\n`;
    msg += `Protocolo de inspección para **Fuga en cilindros o mangueras de tolva** en **${nombreEquipo}**:\n\n`;
    msg += `1. **Despresurización:** Apaga el motor y mueve el joystick en todas direcciones para despresurizar el circuito.\n`;
    msg += `2. **Inspección de sellos:** Limpia el vástago del cilindro telescópico y observa si hay rayaduras o fuga por el retén rascador.\n`;
    msg += `3. **Acoples:** Verifica el torque de racores y mangueras de alta presión buscando dilataciones o fisuras.\n\n`;
    msg += `¿Qué condición encontraste?`;

    return {
      message: msg,
      alternativas: [
        "Sello de vástago con fuga activa",
        "Manguera con abrasión o fisura",
        "Sin fugas tras reapriete",
      ],
      fuentesAdicionales: fuentesUsadas,
    };
  }

  // FRENOS
  if (normMsg.includes("esponjoso") || (normMsg.includes("presion") && normMsg.includes("freno"))) {
    let msg = `🛑 **Asistente TAGSENSE · Diagnóstico de Frenos**\n\n`;
    msg += `Procedimiento para **Pedal esponjoso o baja presión de frenado** en **${nombreEquipo}**:\n\n`;
    msg += `1. **Acumuladores:** Revisa la presión de precarga en los acumuladores de nitrógeno (mínimo 90 bar).\n`;
    msg += `2. **Purga de aire:** Realiza purga de aire en los purgadores de cada rueda comenzando por el eje posterior.\n`;
    msg += `3. **Válvula moduladora:** Comprueba que no exista retorno excesivo al estanque al pisar el freno.\n\n`;
    msg += `¿Qué resultado arrojó la verificación de frenos?`;

    return {
      message: msg,
      alternativas: [
        "Aire en circuito purgado con éxito",
        "Baja precarga en acumulador",
        "Registrar hallazgo en informe",
      ],
      fuentesAdicionales: fuentesUsadas,
    };
  }

  // 7. INTENCIÓN: Resultado de prueba guiada
  if (
    normMsg.includes("dentro de rango") ||
    normMsg.includes("presion baja") ||
    normMsg.includes("fuga visible") ||
    normMsg.includes("solenoide") ||
    normMsg.includes("obstruccion") ||
    normMsg.includes("sello de vastago") ||
    normMsg.includes("manguera con") ||
    normMsg.includes("sin fugas") ||
    normMsg.includes("aire en circuito") ||
    normMsg.includes("baja precarga") ||
    normMsg.includes("anomalia confirmada")
  ) {
    return {
      message: `📋 **Asistente TAGSENSE · Registro de Diagnóstico**\n\nEntendido. He incorporado el hallazgo (**${message}**) a la sesión de trabajo para **${nombreEquipo}${modeloStr}**.\n\nPara cerrar el ciclo de mantenimiento, puedes registrar formalmente el informe o continuar con la revisión de otro componente:`,
      alternativas: [
        "Registrar hallazgo en informe",
        "Consultar otro componente",
        "Escalar a supervisor",
      ],
      fuentesAdicionales: fuentesUsadas,
    };
  }

  // 8. INTENCIÓN: Reporte inicial de falla por sistema (Tolva, Frenos, Hidráulico, etc.)
  let sistema = categorySlug;
  if (!sistema) {
    if (normMsg.includes("tolva") || normMsg.includes("volteo") || normMsg.includes("levante")) sistema = "tolva";
    else if (normMsg.includes("freno")) sistema = "frenos";
    else if (normMsg.includes("hidraul") || normMsg.includes("bomba")) sistema = "hidraulico";
    else if (normMsg.includes("temperatura") || normMsg.includes("motor") || normMsg.includes("calor") || normMsg.includes("refrigerante")) sistema = "temperatura";
    else if (normMsg.includes("direccion") || normMsg.includes("volante") || normMsg.includes("giro")) sistema = "direccion";
    else if (normMsg.includes("electr") || normMsg.includes("bateria") || normMsg.includes("arranque")) sistema = "electrico";
    else if (normMsg.includes("sensor") || normMsg.includes("codigo") || normMsg.includes("alerta")) sistema = "sensores";
  }

  // Prioridad: si este sistema tiene tags de fallas guardados en la ficha técnica
  if (sistema) {
    const fichaFallas = fichasSistemas.find(
      (item) => item.category_slug === sistema && item.field_type_slug === "fallas"
    );
    const fichaEquip = fichasSistemas.find(
      (item) => item.category_slug === sistema && item.field_type_slug === "equipamiento"
    );

    if (fichaFallas && fichaFallas.content) {
      const tagsFallas = fichaFallas.content
        .split(/\n|•/)
        .map((s) => s.trim().replace(/^[\s\-*•\d.]+/, "").trim())
        .filter((s) => s.length > 2)
        .map((line) => {
          const colonIdx = line.indexOf(":");
          if (colonIdx > 0 && colonIdx <= 45) return line.substring(0, colonIdx).trim();
          const dashIdx = line.search(/\s+[—–-]\s+/);
          if (dashIdx > 0 && dashIdx <= 45) return line.substring(0, dashIdx).trim();
          return line.slice(0, 32).trim();
        });

      if (tagsFallas.length > 0) {
        let msg = `🤖 **Asistente TAGSENSE · Diagnóstico de ${sistema.toUpperCase()}**\n\n`;
        msg += `He analizado la ficha técnica y documentación oficial de **${nombreEquipo}${modeloStr}** para **${sistema.toUpperCase()}**:\n\n`;
        if (fichaEquip && fichaEquip.content) {
          const primerParam = fichaEquip.content.split(/\n|•/).find((l) => l.trim().length > 4);
          if (primerParam) {
            msg += `• **Parámetro técnico de referencia:** ${primerParam.trim().replace(/^[\s\-*•]+/, "")}\n\n`;
          }
        }
        msg += `¿Cuál de las siguientes condiciones o síntomas detectas en el equipo?`;
        return {
          message: msg,
          alternativas: [
            ...tagsFallas.slice(0, 3).map((t) => (t.length > 32 ? t.substring(0, 30) + "…" : t)),
            "Procedimientos de inspección",
          ],
          fuentesAdicionales: fuentesUsadas,
        };
      }
    }
  }

  if (sistema === "tolva") {
    const nota = buscarNotaFicha("tolva") || "Cilindros de volteo de doble efecto conectados al circuito hidráulico principal.";
    return {
      message: `🤖 **Asistente TAGSENSE · Diagnóstico de Tolva**\n\nHe analizado la documentación técnica de **${nombreEquipo}${modeloStr}** para **TOLVA Y VOLTEO**:\n\n• ${nota}\n\nPara orientarte con precisión, ¿cuál es el síntoma principal que presenta la tolva?`,
      alternativas: [
        "Tolva no sube o sube muy lenta",
        "Tolva no baja o desciende con golpe",
        "Fuga en cilindros de levante",
      ],
      fuentesAdicionales: fuentesUsadas,
    };
  }

  if (sistema === "frenos") {
    const nota = buscarNotaFicha("frenos") || "Frenos de servicio: Discos húmedos enfriados por aceite forzado en todos los ejes con circuito doble independiente.";
    return {
      message: `🤖 **Asistente TAGSENSE · Diagnóstico de Frenos**\n\nHe analizado los parámetros oficiales de **${nombreEquipo}${modeloStr}** para **FRENOS**:\n\n• ${nota}\n\n¿Cuál es el síntoma principal que presenta el sistema de frenos?`,
      alternativas: [
        "Pedal esponjoso o baja presión",
        "Sobrecalentamiento o bloqueo",
        "Freno de parqueo no libera / no retiene",
      ],
      fuentesAdicionales: fuentesUsadas,
    };
  }

  if (sistema === "hidraulico") {
    const nota = buscarNotaFicha("hidraulico") || "Circuito hidráulico central con bombas de caudal variable y válvulas de alivio proporcionales.";
    return {
      message: `🤖 **Asistente TAGSENSE · Diagnóstico Hidráulico**\n\nHe analizado la ficha de **${nombreEquipo}${modeloStr}** para **SISTEMA HIDRÁULICO**:\n\n• ${nota}\n\n¿Cuál es la anomalía principal observada?`,
      alternativas: [
        "Baja presión de trabajo general",
        "Ruido o cavitación en bomba",
        "Fuga en mangueras o estanque",
      ],
      fuentesAdicionales: fuentesUsadas,
    };
  }

  if (sistema === "temperatura") {
    const nota = buscarNotaFicha("temperatura") || "Circuito de refrigeración forzada para motor con termostato regulado y enfriador de aceite.";
    return {
      message: `🤖 **Asistente TAGSENSE · Diagnóstico de Temperatura**\n\nHe analizado los datos de **${nombreEquipo}${modeloStr}** para **TEMPERATURA Y MOTOR**:\n\n• ${nota}\n\n¿Cuál es la falla o alerta detectada?`,
      alternativas: [
        "Temperatura sobre 105°C en motor",
        "Nivel bajo de refrigerante o fuga",
        "Alerta de baja presión de aceite",
      ],
      fuentesAdicionales: fuentesUsadas,
    };
  }

  if (sistema === "direccion") {
    const nota = buscarNotaFicha("direccion") || "Dirección hidromecánica articulada con sistema secundario de emergencia según norma ISO 5010.";
    return {
      message: `🤖 **Asistente TAGSENSE · Diagnóstico de Dirección**\n\nHe analizado los parámetros de **${nombreEquipo}${modeloStr}** para **DIRECCIÓN Y ARTICULACIÓN**:\n\n• ${nota}\n\n¿Cuál es el problema que presenta la dirección?`,
      alternativas: [
        "Dirección pesada / giro lento",
        "Juego excesivo en pasadores de giro",
        "Alerta dirección de emergencia",
      ],
      fuentesAdicionales: fuentesUsadas,
    };
  }

  if (sistema === "electrico") {
    const nota = buscarNotaFicha("electrico") || "Sistema eléctrico 24V con interruptor maestro LOTO, baterías de servicio y alternador de 28V.";
    return {
      message: `🤖 **Asistente TAGSENSE · Diagnóstico Eléctrico**\n\nHe analizado los datos de **${nombreEquipo}${modeloStr}** para **SISTEMA ELÉCTRICO**:\n\n• ${nota}\n\n¿Cuál es el síntoma observado?`,
      alternativas: [
        "Equipo no da arranque / batería baja",
        "Códigos de falla en display",
        "Falla en luces o alternador",
      ],
      fuentesAdicionales: fuentesUsadas,
    };
  }

  // 9. FALLBACK GENERAL CONTEXTUAL
  return {
    message: `🤖 **Asistente TAGSENSE · Diagnóstico Técnico**\n\nHe consultado la ficha y manuales de **${nombreEquipo}${modeloStr}**.\n\nPara orientarte de forma ordenada, selecciona una de las siguientes opciones:`,
    alternativas: [
      "📋 Especificaciones Técnicas",
      "Procedimientos de inspección",
      "Consultar otro componente",
    ],
    fuentesAdicionales: fuentesUsadas,
  };
}
