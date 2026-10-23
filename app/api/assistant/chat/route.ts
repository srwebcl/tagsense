import { getCurrentAppUser } from "@/lib/current-user";
import { pool } from "@/lib/db";
import { embedQuery } from "@/lib/voyage";
import { anthropic } from "@/lib/anthropic";
import { checkRateLimit } from "@/lib/rate-limit";
import { withErrorLogging } from "@/lib/api-handler";
import { listarTiposFicha, type FichaFieldType } from "@/lib/fault-categories";
import { generarRespuestaGemini } from "@/lib/gemini";

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
4. REGLA ESTRICTA SI FALTA INFORMACIÓN TÉCNICA:
   Si la ficha técnica o documentación cargada NO contiene el dato consultado (por ejemplo: capacidad de aceite de motor, presiones, torques, etc.):
   - NUNCA inventes información ni asumas datos de otros equipos.
   - PROHIBIDO TERMINANTEMENTE mencionar el Administrador, la edición de fichas técnicas o invitar a ingresar información en paneles web.
   - Responde directa y honestamente usando estricta y únicamente la siguiente fórmula:
     "En la ficha técnica de [Nombre del Activo] no está registrada la [especificación consultada]."
     Ejemplo exacto: "En la ficha técnica de Pala de Prueba QA no está registrada la capacidad de aceite de motor."
   - Ofrece como alternativas consultar con supervisión, verificar físicamente en terreno o revisar otro componente disponible.
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
7. Responde en español de Chile, con tono técnico, claro y conciso para leer en un teléfono en faena.
8. DIFERENCIACIÓN OBLIGATORIA ENTRE CONSULTAS INFORMATIVAS Y REPORTES DE FALLA:
   - Si el técnico hace una consulta informativa pura (por ejemplo: "¿qué motor usa?", "¿cuál es la potencia?", "¿cuál es el peso?", "¿qué aceite lleva?"):
     * Responde ÚNICAMENTE con los datos técnicos de la ficha oficial.
     * NUNCA asumas que el equipo está fallando ni preguntes de inmediato qué falla tiene.
     * En las alternativas de acción, ofrece opciones de fluidos, especificaciones adicionales, ver ficha técnica o consultar otro componente.
   - Si el técnico indica que no hay fallas ("no tiene fallas", "no hay problemas", "solo quería saber", "todo bien", "equipo normal/operativo"):
     * Valida con cordialidad que el componente y el equipo operan con normalidad.
     * Cierra el ciclo de diagnóstico de averías y ofrece opciones neutrales.
   - Solo debes ofrecer alternativas de síntomas de fallas o iniciar el árbol de diagnóstico si el técnico explícitamente reporta una avería, ruido, fuga, humo o código de falla.`;

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
  return (texto || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
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
  const historyRaw = Array.isArray(body?.history) ? body.history : [];
  const history = historyRaw
    .filter((h: any) => h && (h.role === "user" || h.role === "assistant") && typeof h.content === "string")
    .map((h: any) => ({
      role: h.role === "assistant" ? ("assistant" as const) : ("user" as const),
      content: String(h.content).trim(),
    }));
  if (!assetId || !message) {
    return Response.json({ error: { code: "bad_request", message: "Falta asset_id o message." } }, { status: 400 });
  }

  // 1. Iniciar en paralelo Voyage embedding y tipos de ficha para máxima agilidad
  const embedPromise = embedQuery(message).catch((err) => {
    console.warn(`[assistant/chat] Voyage no disponible (tenant ${appUser.tenant_id}):`, err);
    return null;
  });
  const tiposFichaPromise = listarTiposFicha(appUser.tenant_id).catch(() => []);

  // 2. FUENTE 2 (Ficha del activo): Carga de datos maestros del equipo
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

  // Cargar en paralelo componentes y notas técnicas del activo
  const [componentsResult, fichasResult] = await Promise.all([
    pool.query(
      `select fc.slug, fc.name
       from asset_components ac
       join fault_categories fc on fc.slug = ac.category_slug
       where ac.tenant_id = $1 and ac.asset_id = $2
       order by fc.name asc`,
      [appUser.tenant_id, realAssetId]
    ),
    pool.query(
      `select ad.title, ad.category_slug, ad.field_type_slug, coalesce(ad.raw_text, '') as content
       from asset_documents ad
       where ad.tenant_id = $1 and ad.asset_id = $2 and ad.category_slug is not null
       order by ad.category_slug, ad.field_type_slug`,
      [appUser.tenant_id, realAssetId]
    ),
  ]);
  const componentes = componentsResult.rows;
  const fichasSistemas = fichasResult.rows;

  // Esperar el vector de búsqueda (que corrió en paralelo con la BD)
  const queryVector: number[] | null = await embedPromise;

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
  const tiposFicha = await tiposFichaPromise;
  const fieldTypeSlug = detectarTipoFichaSolicitado(keywords, tiposFicha);
  const chunksOrdenados = reordenarPorPalabrasClave(candidatos, keywords, categorySlug, fieldTypeSlug);

  // Limitar a los 4 fragmentos más relevantes para reducir drásticamente el tamaño del prompt y la latencia
  const chunksParaPrompt = chunksOrdenados.slice(0, 4);
  const sources = [...new Set(chunksParaPrompt.map((r) => r.title))];

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

  // Construir bloque de Manuales PDF con los fragmentos más pertinentes
  const manualContextBlock = chunksParaPrompt.length
    ? chunksParaPrompt
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

  const esAccionArbol =
    categorySlug !== null ||
    /^(\d+[\.\)]|\ud83d|\ud83c|\u2699|\u26a0|\u2705|\u274c|\ud83d\uded1)/.test(message) ||
    /^(tengo una falla|falla en|consultar especificaciones|cambiar componente|otro componente|falla confirmada|falla corregida|anomalia confirmada|abrir informe|procedimiento)/i.test(
      message.trim()
    );

  let answer = "";
  let alternativas: string[] = [];
  let fallback = false;

  // 1. Prioridad: Google AI Studio (Gemini 3.5 Flash - Nivel gratuito veloz y de alto contexto)
  if (process.env.GOOGLE_API_KEY) {
    try {
      const geminiResult = await generarRespuestaGemini(
        SYSTEM_PROMPT,
        userPrompt,
        history
      );
      if (geminiResult && geminiResult.message) {
        answer = geminiResult.message;
        alternativas = geminiResult.alternativas;
      }
    } catch (err) {
      console.warn(`[assistant/chat] Gemini no disponible, intentando proveedores secundarios:`, err);
    }
  }

  // 2. Proveedor Secundario: Anthropic Claude (si está configurado)
  if (!answer && process.env.ANTHROPIC_API_KEY) {
    try {
      const anthropicMessages = [
        ...history,
        { role: "user" as const, content: userPrompt },
      ];
      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: anthropicMessages,
      });

      const textBlock = response.content.find((b) => b.type === "text");
      const rawAnswer = textBlock && textBlock.type === "text" ? textBlock.text : "";

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
      console.warn(`[assistant/chat] Claude no disponible:`, err);
    }
  }

  // 3. Respaldo Estructurado Inteligente (Garantía 100% de operatividad en faena sin internet o contingencia)
  if (!answer) {
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

  if (!alternativas || alternativas.length === 0) {
    alternativas = ["📋 Especificaciones Técnicas", "🔄 Cambiar de componente"];
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

// ================= MOTOR INTELIGENTE DEL BOT (100% ESTRUCTURADO Y LÓGICO) =================
// Opera como un árbol de diagnóstico técnico guiado con sentido común minero.
// Se alimenta exclusivamente de la información real cargada en las fichas técnicas del activo.

interface AssetData {
  name: string;
  model: string | null;
  serial_number: string | null;
  status: string | null;
  hour_meter: string | null;
  manufacturer: string | null;
  location?: string | null;
  specs: Record<string, string> | null;
}

interface TagItem {
  title: string;
  detail: string;
}

function parseFichaTags(raw: string): TagItem[] {
  if (!raw) return [];
  const lines = raw.split(/\n|•/).map((l) => l.trim()).filter(Boolean);
  const items: TagItem[] = [];
  for (const line of lines) {
    const clean = line.replace(/^[\s\-*•\d.]+/, "").trim();
    if (!clean) continue;
    const colonIdx = clean.indexOf(":");
    if (colonIdx > 0 && colonIdx <= 65) {
      items.push({
        title: clean.substring(0, colonIdx).trim(),
        detail: clean.substring(colonIdx + 1).trim(),
      });
    } else {
      const dashIdx = clean.search(/\s+[—–-]\s+/);
      if (dashIdx > 0 && dashIdx <= 65) {
        items.push({
          title: clean.substring(0, dashIdx).trim(),
          detail: clean.substring(dashIdx).replace(/^[\s—–-]+/, "").trim(),
        });
      } else {
        items.push({
          title: clean,
          detail: "",
        });
      }
    }
  }
  return items;
}

const ICONOS_COMPONENTES: Record<string, string> = {
  frenos: "🛑",
  motor: "⚙️",
  hidraulico: "💧",
  tolva: "📦",
  direccion: "🔄",
  ejes: "🚛",
  temperatura: "🌡️",
  electrico: "⚡",
  suspension: "🔩",
  neumaticos: "🛞",
  sensores: "🚨",
};

const NOMBRES_FALLBACK: Record<string, string> = {
  frenos: "Frenos y Retardo",
  motor: "Motor y Combustible",
  hidraulico: "Sistema Hidráulico",
  tolva: "Tolva y Levante",
  direccion: "Dirección y Articulación",
  ejes: "Transmisión y Ejes",
  temperatura: "Refrigeración y Temperatura",
  electrico: "Sistema Eléctrico y Sensores",
  suspension: "Suspensión y Chasis",
  neumaticos: "Neumáticos y Llantas",
  sensores: "Sensores y Telemetría",
};

export function construirRespuestaBotInteligente(
  asset: AssetData,
  componentes: { slug: string; name: string }[],
  fichasSistemas: { title: string; category_slug: string | null; field_type_slug?: string | null; content: string }[],
  _chunks: { content: string; title: string; category_slug: string | null }[],
  keywords: string[],
  categorySlug: string | null,
  message: string
): { message: string; alternativas: string[]; fuentesAdicionales?: string[] } {
  const normMsg = normalizarTexto(message);
  const nombreEquipo = asset.name || "Equipo";
  const modeloStr = asset.model ? ` (${asset.model})` : "";
  const specs = asset.specs || {};
  const fuentesUsadas: string[] = ["Ficha Técnica Oficial"];

  // Helper para nombre legible de categoría
  const getNombreComp = (slug: string): string => {
    const c = componentes.find((x) => x.slug === slug);
    return c?.name || NOMBRES_FALLBACK[slug] || slug.toUpperCase();
  };

  // Helper para lista de botones de componentes del activo
  const getBotonesComponentes = (): string[] => {
    const slugsConFicha = Array.from(
      new Set(fichasSistemas.map((f) => f.category_slug).filter(Boolean) as string[])
    );
    const slugsDisponibles = componentes.length
      ? componentes.map((c) => c.slug)
      : slugsConFicha;

    const lista = slugsDisponibles.map((slug) => {
      const icono = ICONOS_COMPONENTES[slug] || "🔧";
      const nom = getNombreComp(slug);
      const corto = nom.length > 25 ? nom.slice(0, 24) + "…" : nom;
      return `${icono} ${corto}`;
    });
    return [...lista.slice(0, 6), "📋 Especificaciones Técnicas"];
  };

  // 1. INTENCIÓN PRIORITARIA: Negación de falla / Aclaración "Sin fallas" / Consulta puramente informativa
  const esNegacionSinFalla =
    /\b(no tiene falla|no hay falla|sin falla|no falla|ninguna falla|no presenta falla|cero falla|no tiene averia|sin averia|no hay averia|ningun problema|no tiene problema|no hay problema|sin problema|todo bien|todo normal|todo en orden|esta operativo|esta normal|esta impecable|esta perfecto|solo queria saber|solo queria consultar|solo queria ver|solo era una duda|solo era una pregunta|solo una consulta|solo una duda|solo pregunto|no le pasa nada|no tiene nada|no pasa nada|ninguno|ninguna|nada)\b/i.test(normMsg);

  if (esNegacionSinFalla) {
    const tieneMotor = normMsg.includes("motor") || categorySlug === "motor";
    const tieneFrenos = normMsg.includes("freno") || categorySlug === "frenos";
    const tieneHidraulico = normMsg.includes("hidraul") || categorySlug === "hidraulico";

    let detalleComp = "";
    if (tieneMotor) detalleComp = "el motor";
    else if (tieneFrenos) detalleComp = "el sistema de frenos";
    else if (tieneHidraulico) detalleComp = "el sistema hidráulico";
    else if (categorySlug) detalleComp = `el sistema de ${getNombreComp(categorySlug)}`;

    if (detalleComp) {
      return {
        message: `👍 **Comprobación de Estado · ${detalleComp.toUpperCase()}**\n\nEntendido. Queda registrado que **${detalleComp}** de **${nombreEquipo}${modeloStr}** opera con normalidad y no presenta condiciones anómalas ni fallas activas.\n\n¿Deseas consultar otro parámetro técnico o revisar otro sistema del equipo?`,
        alternativas: [
          "🛢️ Fluidos y lubricación",
          "📋 Ficha Técnica",
          "🔄 Consultar otro componente",
          "Escalar a supervisor",
        ],
        fuentesAdicionales: fuentesUsadas,
      };
    }

    return {
      message: `👍 **Equipo Operativo**\n\nEntendido. Confirmado que **${nombreEquipo}${modeloStr}** se mantiene en condición normal sin anomalías reportadas en este turno.\n\n¿Deseas consultar especificaciones técnicas, lubricación o revisar algún componente?`,
      alternativas: [
        "📋 Ver Ficha Técnica",
        "🛢️ Puntos de engrase y fluidos",
        "🔄 Consultar un componente",
        "Escalar a supervisor",
      ],
      fuentesAdicionales: fuentesUsadas,
    };
  }

  // 2. INTENCIÓN: Agradecimiento y Cierre Cordial
  const msgSinPuntos = normMsg.replace(/[.,!¡¿?]/g, "").trim();
  const esAgradecimiento =
    /^(gracias|muchas gracias|muchisimas gracias|vale|ok gracias|listo gracias|perfecto gracias|excelente gracias|entendido|comprendido|todo claro|buenisimo|de diez|ok vale|muchas gracias bot|gracias bot)$/i.test(msgSinPuntos) ||
    /\b(muchas gracias|muchisimas gracias)\b/i.test(normMsg);

  if (esAgradecimiento) {
    return {
      message: `🤖 **Asistente TAGSENSE**\n\n¡De nada! Quedo a tu disposición si necesitas verificar torques, tolerancias, presiones o procedimientos en terreno para **${nombreEquipo}${modeloStr}**.\n\n¡Buen trabajo y turno seguro en faena!`,
      alternativas: [
        "📋 Ver Ficha Técnica",
        "🔄 Consultar un componente",
        "Escalar a supervisor",
      ],
      fuentesAdicionales: fuentesUsadas,
    };
  }

  // 3. INTENCIÓN: Registro de anomalía confirmada / Generar informe
  if (
    normMsg.includes("falla confirmada") ||
    normMsg.includes("anomalia confirmada") ||
    normMsg.includes("generar informe") ||
    normMsg.includes("abrir informe") ||
    normMsg.includes("registrar hallazgo") ||
    normMsg.includes("sigue fallando") ||
    normMsg.includes("no se soluciono") ||
    normMsg.includes("requiere reparacion")
  ) {
    return {
      message: `⚠️ **Registro de Anomalía Confirmada**\n\nHe registrado la condición crítica en la sesión de **${nombreEquipo}${modeloStr}**.\n\nEl equipo requiere un informe técnico formal para gestionar repuestos, coordinar la intervención o aplicar detención preventiva segura según protocolo de faena.\n\nPuedes abrir el formulario digital ahora o notificar por WhatsApp al supervisor:`,
      alternativas: [
        "Abrir Formulario de Informe",
        "Escalar a supervisor",
        "🔄 Cambiar de componente",
      ],
      fuentesAdicionales: fuentesUsadas,
    };
  }

  // 4. INTENCIÓN: Falla corregida en terreno / Sistema operativo
  if (
    normMsg.includes("falla corregida") ||
    normMsg.includes("corregida en terreno") ||
    normMsg.includes("solucionado") ||
    normMsg.includes("falla resuelta") ||
    normMsg.includes("quedo operativo") ||
    normMsg.includes("reparado") ||
    normMsg.includes("sin fugas") ||
    normMsg.includes("aire en circuito purgado") ||
    normMsg.includes("dentro de rango")
  ) {
    return {
      message: `✅ **Falla Corregida en Terreno**\n\n¡Excelente trabajo! Se verificó la normalización del sistema conforme a los parámetros oficiales de **${nombreEquipo}${modeloStr}**.\n\nEl equipo se mantiene en condición **OPERATIVO**.\n\n¿Deseas registrar una nota breve en el informe técnico o continuar inspeccionando otro componente?`,
      alternativas: [
        "Abrir Formulario de Informe",
        "🔄 Inspeccionar otro componente",
        "📋 Ver especificaciones",
      ],
      fuentesAdicionales: fuentesUsadas,
    };
  }

  // 5. INTENCIÓN: Volver al menú / Cambiar de componente / Lista de componentes
  if (
    normMsg.includes("otro componente") ||
    normMsg.includes("cambiar componente") ||
    normMsg.includes("otro sistema") ||
    normMsg.includes("volver a opciones") ||
    normMsg.includes("menu principal") ||
    normMsg.includes("diagnosticar una falla") ||
    normMsg.includes("ver componentes") ||
    normMsg.includes("inicio") ||
    normMsg.includes("menu") ||
    normMsg.includes("hola") ||
    normMsg.includes("empezar")
  ) {
    return {
      message: `🤖 **Asistente TAGSENSE · Diagnóstico por Componente**\n\nSelecciona el componente o sistema de **${nombreEquipo}${modeloStr}** que deseas revisar o diagnosticar:`,
      alternativas: getBotonesComponentes(),
      fuentesAdicionales: fuentesUsadas,
    };
  }

  // 6. INTENCIÓN: Consulta Específica de Motorización / Datos del Motor (Informativo, NO falla)
  const esConsultaFluidos =
    normMsg.includes("engrase") ||
    normMsg.includes("fluido") ||
    normMsg.includes("lubricac") ||
    normMsg.includes("aceite") ||
    normMsg.includes("grasa") ||
    normMsg.includes("refrigerante");

  const esConsultaMotorInfo =
    !esConsultaFluidos &&
    (/\b(que motor|cual motor|modelo de motor|motor usa|motor tiene|marca del motor|potencia del motor|cilindrada|ficha del motor|datos del motor|especificaciones del motor|tipo de motor|motorizacion)\b/i.test(normMsg) ||
    (/\bmotor\b/i.test(normMsg) && /\b(usa|cual|que|modelo|marca|tipo|potencia|hp|rpm)\b/i.test(normMsg)));

  if (esConsultaMotorInfo) {
    const fichaMotor = fichasSistemas.find(
      (f) => f.category_slug === "motor" && f.field_type_slug === "equipamiento"
    );
    const tagsMotor = fichaMotor && fichaMotor.content ? parseFichaTags(fichaMotor.content) : [];
    if (fichaMotor && !fuentesUsadas.includes(fichaMotor.title)) fuentesUsadas.push(fichaMotor.title);

    const tagMotorOem = tagsMotor.find((t) => /motor oem|modelo|motor/i.test(t.title));
    const tagPotencia = tagsMotor.find((t) => /potencia|torque/i.test(t.title));
    const tagInyeccion = tagsMotor.find((t) => /inyecci|combustible/i.test(t.title));
    const tagFluidos = tagsMotor.find((t) => /aceite|fluido|capacidad/i.test(t.title));

    const motorDesc = tagMotorOem?.detail || specs.engine_type || specs.motor || asset.model || "Motorización OEM estándar";
    const potenciaDesc = tagPotencia?.detail || specs.power || "Potencia nominal según diseño OEM";

    let msg = `⚙️ **Motorización Oficial · ${nombreEquipo}${modeloStr}**\n\n`;
    msg += `Datos técnicos maestros registrados en la ficha oficial:\n\n`;
    msg += `• **Motor OEM:** ${motorDesc}\n`;
    msg += `• **Potencia y Régimen:** ${potenciaDesc}\n`;
    if (tagInyeccion) {
      msg += `• **Inyección y Alimentación:** ${tagInyeccion.detail}\n`;
    }
    if (tagFluidos) {
      msg += `• **Capacidades registradas:** ${tagFluidos.detail}\n`;
    }
    msg += `\n¿Deseas consultar sus capacidades de fluidos, tolerancias de operación o revisar otro componente?`;

    return {
      message: msg,
      alternativas: [
        "🛢️ Aceite y fluidos de motor",
        "📋 Ver Ficha Técnica",
        "🔍 Diagnosticar una anomalía",
        "🔄 Cambiar de componente",
      ],
      fuentesAdicionales: fuentesUsadas,
    };
  }

  // 7. INTENCIÓN: Consulta de Transmisión / Tren de Fuerza (Informativo, NO falla)
  const esConsultaTransmision =
    /\b(que transmision|cual transmision|caja de cambio|caja de transmision|modelo de transmision|que caja usa|convertidor)\b/i.test(normMsg);

  if (esConsultaTransmision) {
    const fichaEjes = fichasSistemas.find(
      (f) => f.category_slug === "ejes" && f.field_type_slug === "equipamiento"
    );
    const tagsEjes = fichaEjes && fichaEjes.content ? parseFichaTags(fichaEjes.content) : [];
    const tagTransmision = tagsEjes.find((t) => /transmision|caja/i.test(t.title));
    const desc = tagTransmision?.detail || specs.transmission || "Transmisión según diseño OEM";

    return {
      message: `🚛 **Transmisión y Tren de Fuerza · ${nombreEquipo}${modeloStr}**\n\n• **Transmisión OEM:** ${desc}\n\n¿Deseas consultar presiones de embrague, fluidos o revisar otro sistema?`,
      alternativas: [
        "🛢️ Aceite de transmisión",
        "📋 Ver Ficha Técnica",
        "🔄 Cambiar de componente",
      ],
      fuentesAdicionales: fuentesUsadas,
    };
  }

  // 8. INTENCIÓN: Ficha y Especificaciones Generales
  if (
    normMsg.includes("especific") ||
    normMsg.includes("ficha") ||
    normMsg.includes("specs") ||
    normMsg.includes("datos del equipo") ||
    normMsg.includes("capacidad y peso") ||
    normMsg.includes("cuanto pesa") ||
    normMsg.includes("peso operativo") ||
    normMsg.includes("cuanto carga") ||
    normMsg.includes("capacidad de carga") ||
    normMsg.includes("horometro")
  ) {
    let msg = `📋 **Asistente TAGSENSE · Ficha y Especificaciones Oficiales**\n\n`;
    msg += `Datos técnicos maestros de **${nombreEquipo}${modeloStr}**:\n\n`;
    msg += `• **Modelo / Fabricante:** ${asset.model || nombreEquipo} (${asset.manufacturer || "OEM"})\n`;
    msg += `• **Motorización OEM:** ${specs.engine_type || "Estándar"} · Potencia: ${specs.power || "Nominal"}\n`;
    msg += `• **Capacidad de Carga:** ${specs.load_capacity || "Según diseño OEM"} · Peso op.: ${specs.operating_weight || "Nominal"}\n`;
    msg += `• **Horómetro Acumulado:** ${asset.hour_meter || "No registrado"} · Estado: ${asset.status || "Operativo"}\n`;
    if (asset.serial_number) msg += `• **Número de Serie:** ${asset.serial_number}\n`;
    if (asset.location) msg += `• **Ubicación en Faena:** ${asset.location}\n`;
    msg += `\n¿Qué deseas consultar a continuación?`;

    return {
      message: msg,
      alternativas: [
        "🛢️ Puntos de engrase y fluidos",
        "🔍 Diagnosticar un componente",
        "🔄 Cambiar de componente",
      ],
      fuentesAdicionales: fuentesUsadas,
    };
  }

  // 9. INTENCIÓN: Puntos de Engrase y Fluidos / Consulta de Capacidades
  if (
    normMsg.includes("engrase") ||
    normMsg.includes("fluido") ||
    normMsg.includes("lubricac") ||
    normMsg.includes("aceite") ||
    normMsg.includes("grasa") ||
    normMsg.includes("refrigerante")
  ) {
    let compEspecifico = categorySlug;
    if (!compEspecifico) {
      if (normMsg.includes("motor")) compEspecifico = "motor";
      else if (normMsg.includes("hidraul")) compEspecifico = "hidraulico";
      else if (normMsg.includes("transmis") || normMsg.includes("eje")) compEspecifico = "ejes";
      else if (normMsg.includes("freno")) compEspecifico = "frenos";
      else if (normMsg.includes("tolva")) compEspecifico = "tolva";
    }

    const fluidosEncontrados: { comp: string; tag: TagItem }[] = [];
    fichasSistemas.forEach((f) => {
      if (f.field_type_slug === "equipamiento" && f.content && f.category_slug) {
        const tags = parseFichaTags(f.content);
        tags.forEach((t) => {
          const tNorm = normalizarTexto(t.title + " " + t.detail);
          if (
            tNorm.includes("aceite") ||
            tNorm.includes("fluido") ||
            tNorm.includes("refrigerante") ||
            tNorm.includes("grasa") ||
            tNorm.includes("capacidad") ||
            tNorm.includes("litro") ||
            tNorm.includes("galon")
          ) {
            fluidosEncontrados.push({ comp: f.category_slug || "", tag: t });
          }
        });
      }
    });

    if (compEspecifico) {
      const nomC = getNombreComp(compEspecifico);
      const iconoC = ICONOS_COMPONENTES[compEspecifico] || "⚙️";
      const fluidosComp = fluidosEncontrados.filter((f) => f.comp === compEspecifico);

      if (fluidosComp.length > 0) {
        let msg = `${iconoC} **Especificación de Fluidos · ${nomC}**\n\n`;
        msg += `Datos registrados en la ficha técnica de **${nombreEquipo}${modeloStr}**:\n\n`;
        fluidosComp.forEach((item) => {
          msg += `• **${item.tag.title}:** ${item.tag.detail || "Verificado en ficha OEM"}\n`;
        });
        msg += `\n¿Deseas verificar más especificaciones o revisar otro componente?`;

        return {
          message: msg,
          alternativas: [
            "📋 Ver Ficha Técnica",
            `🔧 Diagnosticar ${nomC.slice(0, 18)}`,
            "🔄 Cambiar de componente",
          ],
          fuentesAdicionales: fuentesUsadas,
        };
      } else {
        const paramStr = compEspecifico === "motor" ? "la capacidad de aceite de motor" : `la especificación de aceite o fluidos de ${nomC}`;
        const msg = `En la ficha técnica de ${nombreEquipo} no está registrada ${paramStr}.`;

        return {
          message: msg,
          alternativas: getBotonesComponentes(),
          fuentesAdicionales: fuentesUsadas,
        };
      }
    }

    if (fluidosEncontrados.length > 0) {
      let msg = `🛢️ **Asistente TAGSENSE · Puntos de Engrase y Fluidos**\n\n`;
      msg += `Capacidades y pautas de lubricación registradas para **${nombreEquipo}${modeloStr}**:\n\n`;
      fluidosEncontrados.slice(0, 6).forEach((item) => {
        msg += `• **${getNombreComp(item.comp)} · ${item.tag.title}:** ${item.tag.detail}\n`;
      });
      msg += `\n¿Deseas consultar algún componente en específico o volver a la ficha?`;

      return {
        message: msg,
        alternativas: getBotonesComponentes(),
        fuentesAdicionales: fuentesUsadas,
      };
    } else {
      const msg = `En la ficha técnica de ${nombreEquipo} no está registrada la capacidad de aceite de motor ni especificaciones de fluidos.`;

      return {
        message: msg,
        alternativas: getBotonesComponentes(),
        fuentesAdicionales: fuentesUsadas,
      };
    }
  }

  // 10. INTENCIÓN: Procedimientos Técnicos Paso a Paso (Informativo / Guiado)
  const esConsultaProcedimiento =
    /\b(como se|como medir|como purgar|como cambiar|como regular|como verificar|procedimiento|pasos para|protocolo de)\b/i.test(normMsg);

  if (esConsultaProcedimiento) {
    let compProc = categorySlug;
    if (!compProc) {
      for (const slug of Object.keys(ICONOS_COMPONENTES)) {
        if (normMsg.includes(slug) || normMsg.includes(getNombreComp(slug).toLowerCase())) {
          compProc = slug;
          break;
        }
      }
    }

    const fichasProc = fichasSistemas.filter((f) => f.field_type_slug === "procedimientos");
    for (const fProc of fichasProc) {
      if (fProc.content && (!compProc || fProc.category_slug === compProc)) {
        const tags = parseFichaTags(fProc.content);
        const matchProc = tags.find((t) => {
          const tNorm = normalizarTexto(t.title);
          return keywords.some((kw) => tNorm.includes(kw));
        });

        if (matchProc && fProc.category_slug) {
          const nomComp = getNombreComp(fProc.category_slug);
          const iconoComp = ICONOS_COMPONENTES[fProc.category_slug] || "🔧";
          let msg = `${iconoComp} **Procedimiento Técnico · ${matchProc.title}**\n\n`;
          msg += `Pauta oficial de mantenimiento para **${nombreEquipo}${modeloStr}** (${nomComp}):\n\n`;
          msg += `• **Instrucción:** ${matchProc.detail || "Seguir protocolo de taller OEM."}\n\n`;
          msg += `¿Pudiste ejecutar el procedimiento en faena o requieres apoyo adicional?`;

          return {
            message: msg,
            alternativas: [
              "✅ Procedimiento completado",
              "⚠️ Falla confirmada (generar informe)",
              "🔄 Cambiar de componente",
            ],
            fuentesAdicionales: fuentesUsadas,
          };
        }
      }
    }
  }

  // 11. INTENCIÓN: Coincidencia con Falla Específica del Activo
  const fichasFallasOrdenadas = categorySlug
    ? [
        ...fichasSistemas.filter((f) => f.category_slug === categorySlug && f.field_type_slug === "fallas"),
        ...fichasSistemas.filter((f) => f.category_slug !== categorySlug && f.field_type_slug === "fallas"),
      ]
    : fichasSistemas.filter((f) => f.field_type_slug === "fallas");

  for (const fichaFalla of fichasFallasOrdenadas) {
    if (fichaFalla.content && fichaFalla.category_slug) {
      const tagsFallas = parseFichaTags(fichaFalla.content);
      const catSlug = fichaFalla.category_slug;
      const nomComp = getNombreComp(catSlug);
      const iconoComp = ICONOS_COMPONENTES[catSlug] || "🔧";

      const msgLimpio = normMsg.replace(/^\d+[\.\)\s\-]+/, "").trim();

      const fallaMatch = tagsFallas.find((tf) => {
        const titleNorm = normalizarTexto(tf.title);
        if (msgLimpio === titleNorm || msgLimpio.includes(titleNorm) || titleNorm.includes(msgLimpio)) {
          return true;
        }
        const wordsTitle = titleNorm.split(/[^a-z0-9]+/).filter((w) => w.length > 3 && !STOPWORDS_PREGUNTA.has(w));
        const wordsMsg = msgLimpio.split(/[^a-z0-9]+/).filter((w) => w.length > 3 && !STOPWORDS_PREGUNTA.has(w));
        const intersect = wordsTitle.filter((w) => wordsMsg.includes(w));
        return intersect.length >= 2;
      });

      if (fallaMatch) {
        if (!fuentesUsadas.includes(fichaFalla.title)) fuentesUsadas.push(fichaFalla.title);

        const fichaProc = fichasSistemas.find(
          (f) => f.category_slug === catSlug && f.field_type_slug === "procedimientos"
        );
        const fichaEquip = fichasSistemas.find(
          (f) => f.category_slug === catSlug && f.field_type_slug === "equipamiento"
        );

        const tagsProc = fichaProc && fichaProc.content ? parseFichaTags(fichaProc.content) : [];
        const tagsEquip = fichaEquip && fichaEquip.content ? parseFichaTags(fichaEquip.content) : [];

        let msg = `${iconoComp} **Protocolo de Verificación · ${fallaMatch.title}**\n\n`;
        msg += `**Sistema:** ${nomComp} · **Equipo:** ${nombreEquipo}${modeloStr}\n\n`;

        if (fallaMatch.detail) {
          msg += `**Criterio Técnico / Causa Raíz:**\n• ${fallaMatch.detail}\n\n`;
        }

        if (tagsEquip.length > 0) {
          msg += `**Parámetros Nominales de Referencia (OEM):**\n`;
          tagsEquip.slice(0, 3).forEach((eq) => {
            msg += eq.detail ? `• **${eq.title}:** ${eq.detail}\n` : `• ${eq.title}\n`;
          });
          msg += `\n`;
        }

        if (tagsProc.length > 0) {
          msg += `**Procedimiento de Comprobación en Terreno:**\n`;
          tagsProc.slice(0, 4).forEach((pr, idx) => {
            msg += `${idx + 1}. **${pr.title}:** ${pr.detail || "Verificar condición física y funcional."}\n`;
          });
          msg += `\n¿Pudiste normalizar la condición en terreno o la anomalía queda confirmada?`;
        } else {
          msg += `**Procedimiento de Inspección en Faena:**\n`;
          msg += `1. **Seguridad (LOTO):** Estacionar en superficie plana, aplicar cuñas y bloquear energías.\n`;
          msg += `2. **Inspección Física:** Verificar ausencia de fugas, conectores sueltos o daños estructurales.\n`;
          msg += `3. **Prueba Funcional:** Medir parámetro con instrumento calibrado y comparar con tolerancia OEM.\n\n`;
          msg += `¿Pudiste corregir el problema en terreno o la anomalía queda confirmada?`;
        }

        const otraFallaOpcion = `🔍 Otra falla de ${nomComp.slice(0, 16)}`;
        return {
          message: msg,
          alternativas: [
            "✅ Falla corregida en terreno",
            "⚠️ Falla confirmada (generar informe)",
            otraFallaOpcion,
            "🔄 Cambiar de componente",
          ],
          fuentesAdicionales: fuentesUsadas,
        };
      }
    }
  }

  // 12. INTENCIÓN: Detección de Componente Seleccionado (Modo Neutral vs. Modo Avería)
  let detectedSlug = categorySlug;
  if (!detectedSlug) {
    for (const slug of Object.keys(ICONOS_COMPONENTES)) {
      const nom = getNombreComp(slug).toLowerCase();
      if (normMsg.includes(slug) || normMsg.includes(nom)) {
        detectedSlug = slug;
        break;
      }
    }
    if (!detectedSlug) {
      if (normMsg.includes("freno") || normMsg.includes("retardo")) detectedSlug = "frenos";
      else if (normMsg.includes("hidraul") || normMsg.includes("bomba")) detectedSlug = "hidraulico";
      else if (normMsg.includes("tolva") || normMsg.includes("volteo") || normMsg.includes("levante")) detectedSlug = "tolva";
      else if (normMsg.includes("motor") || normMsg.includes("combustible") || normMsg.includes("inyector")) detectedSlug = "motor";
      else if (normMsg.includes("direccion") || normMsg.includes("giro") || normMsg.includes("articulac")) detectedSlug = "direccion";
      else if (normMsg.includes("eje") || normMsg.includes("transmision") || normMsg.includes("convertidor")) detectedSlug = "ejes";
      else if (normMsg.includes("temperatura") || normMsg.includes("calor") || normMsg.includes("refrigerac")) detectedSlug = "temperatura";
      else if (normMsg.includes("electr") || normMsg.includes("bateria") || normMsg.includes("arranque")) detectedSlug = "electrico";
      else if (normMsg.includes("suspens") || normMsg.includes("chasis") || normMsg.includes("amortiguad")) detectedSlug = "suspension";
      else if (normMsg.includes("neumatic") || normMsg.includes("llanta") || normMsg.includes("presion rueda")) detectedSlug = "neumaticos";
      else if (normMsg.includes("sensor") || normMsg.includes("alerta") || normMsg.includes("codigo") || normMsg.includes("pantalla")) detectedSlug = "sensores";
    }
  }

  if (detectedSlug) {
    const nomComp = getNombreComp(detectedSlug);
    const iconoComp = ICONOS_COMPONENTES[detectedSlug] || "🔧";

    const fichaFalla = fichasSistemas.find(
      (f) => f.category_slug === detectedSlug && f.field_type_slug === "fallas"
    );
    const fichaEquip = fichasSistemas.find(
      (f) => f.category_slug === detectedSlug && f.field_type_slug === "equipamiento"
    );

    const tagsFallas = fichaFalla && fichaFalla.content ? parseFichaTags(fichaFalla.content) : [];
    const tagsEquip = fichaEquip && fichaEquip.content ? parseFichaTags(fichaEquip.content) : [];

    if (fichaFalla && !fuentesUsadas.includes(fichaFalla.title)) fuentesUsadas.push(fichaFalla.title);
    if (fichaEquip && !fuentesUsadas.includes(fichaEquip.title)) fuentesUsadas.push(fichaEquip.title);

    const quiereDiagnosticarFalla =
      /\b(falla|problema|anomalia|sintoma|ruido|fuga|temperatura|calienta|humo|vibracion|no frena|no levanta|no gira|no arranca|alerta|codigo|dañado|roto|averia|presion baja|alta temperatura)\b/i.test(normMsg) ||
      /^\d+[\.\)]/.test(normMsg.trim()) ||
      normMsg.startsWith("tengo una falla");

    if (quiereDiagnosticarFalla) {
      let msg = `${iconoComp} **Diagnóstico Técnico · ${nomComp}**\n\n`;
      msg += `Parámetros técnicos oficiales de **${nombreEquipo}${modeloStr}** para **${nomComp.toUpperCase()}**:\n\n`;

      if (tagsEquip.length > 0) {
        tagsEquip.slice(0, 3).forEach((eq) => {
          msg += eq.detail ? `• **${eq.title}:** ${eq.detail}\n` : `• ${eq.title}\n`;
        });
        msg += `\n`;
      }

      msg += `Selecciona el síntoma observado o la condición anómala para iniciar la comprobación en terreno:`;

      const alternativasFallas = tagsFallas.length > 0
        ? tagsFallas.slice(0, 4).map((t, i) => `${i + 1}. ${t.title.length > 28 ? t.title.slice(0, 26) + "…" : t.title}`)
        : [
            `1. Pérdida de rendimiento en ${detectedSlug}`,
            `2. Ruido o vibración anómala`,
            `3. Fuga de fluido en ${detectedSlug}`,
          ];

      return {
        message: msg,
        alternativas: [
          ...alternativasFallas,
          "🔄 Cambiar de componente",
        ],
        fuentesAdicionales: fuentesUsadas,
      };
    } else {
      // Modo informativo / presentación neutral del componente (no asume avería)
      let msg = `${iconoComp} **Sistema: ${nomComp}**\n\n`;
      msg += `Parámetros y equipamiento registrado en **${nombreEquipo}${modeloStr}**:\n\n`;

      if (tagsEquip.length > 0) {
        tagsEquip.slice(0, 4).forEach((eq) => {
          msg += eq.detail ? `• **${eq.title}:** ${eq.detail}\n` : `• ${eq.title}\n`;
        });
        msg += `\n`;
      }

      msg += `¿Qué deseas realizar o consultar en este sistema?`;

      const opciones: string[] = [
        `🔍 Diagnosticar una anomalía`,
      ];
      if (tagsEquip.some((t) => /aceite|fluido|refrigerante|grasa/i.test(t.title + " " + t.detail))) {
        opciones.push(`🛢️ Fluidos de ${nomComp.slice(0, 18)}`);
      } else {
        opciones.push(`📋 Ver Ficha Técnica`);
      }
      opciones.push(`🔄 Cambiar de componente`);

      return {
        message: msg,
        alternativas: opciones,
        fuentesAdicionales: fuentesUsadas,
      };
    }
  }

  // 13. INTENCIÓN: Búsqueda libre en los tags de todas las fichas
  let mejorMatchTag: TagItem | null = null;
  let mejorCatSlug: string | null = null;
  let maxScore = 0;

  fichasSistemas.forEach((f) => {
    if (f.content && f.category_slug) {
      const tags = parseFichaTags(f.content);
      tags.forEach((t) => {
        const fullText = normalizarTexto(t.title + " " + t.detail);
        const score = contarCoincidencias(fullText, keywords);
        if (score > maxScore) {
          maxScore = score;
          mejorMatchTag = t;
          mejorCatSlug = f.category_slug;
        }
      });
    }
  });

  if (mejorMatchTag && mejorCatSlug && maxScore >= 2) {
    const nomComp = getNombreComp(mejorCatSlug);
    return {
      message: `🔍 **Especificación Técnica Encontrada**\n\nEn la ficha de **${nomComp}** para **${nombreEquipo}${modeloStr}**:\n\n• **${(mejorMatchTag as TagItem).title}:** ${(mejorMatchTag as TagItem).detail || "Verificado en ficha técnica OEM."}\n\n¿Deseas iniciar el diagnóstico de este componente o ver otros sistemas?`,
      alternativas: [
        `🔧 Diagnosticar ${nomComp.slice(0, 20)}`,
        "📋 Ver especificaciones",
        "🔄 Cambiar de componente",
      ],
      fuentesAdicionales: fuentesUsadas,
    };
  }

  // 14. FALLBACK GENERAL CONTEXTUAL
  return {
    message: `🤖 **Asistente TAGSENSE · Diagnóstico por Componente**\n\nHe consultado la ficha técnica oficial de **${nombreEquipo}${modeloStr}**.\n\nPara orientarte con máxima precisión en terreno, selecciona el componente que deseas revisar o diagnosticar:`,
    alternativas: getBotonesComponentes(),
    fuentesAdicionales: fuentesUsadas,
  };
}
