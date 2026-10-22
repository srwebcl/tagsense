"use client";

import { useState } from "react";

type FichaTipo = {
  slug: string;
  name: string;
};

export type StructuredTag = {
  title: string;
  detail?: string;
};

const TIPO_CONFIG: Record<
  string,
  {
    label: string;
    sub: string;
    placeholderTitle: string;
    placeholderDetail: string;
    badgeCls: string;
    icon: string;
  }
> = {
  equipamiento: {
    label: "Equipamiento y especificaciones",
    sub: "Define especificaciones con su valor o parámetro técnico para alimentar la IA.",
    placeholderTitle: "Parámetro (ej: Torque pernos caliper)",
    placeholderDetail: "Valor / tolerancia (ej: 180-210 Nm)",
    badgeCls: "tag-equipamiento",
    icon: "⚙️",
  },
  fallas: {
    label: "Fallas principales y síntomas",
    sub: "El título será el botón corto en el Asistente; el detalle explica el criterio técnico a la IA.",
    placeholderTitle: "Botón corto (ej: Vibración al frenar)",
    placeholderDetail: "Diagnóstico para IA (ej: Probable disco alabeado o desgaste)",
    badgeCls: "tag-fallas",
    icon: "⚠️",
  },
  procedimientos: {
    label: "Procedimientos de verificación",
    sub: "Pasos ordenados de inspección y medidas de seguridad que el bot desplegará en terreno.",
    placeholderTitle: "Paso de verificación (ej: Medir espesor pastillas)",
    placeholderDetail: "Criterio técnico (ej: En las 4 ruedas, mínimo 8 mm)",
    badgeCls: "tag-procedimientos",
    icon: "📋",
  },
};

export function parseTagLine(line: string): StructuredTag {
  const clean = line.replace(/^[\s\-*•\d.]+/, "").trim();
  if (!clean) return { title: "" };

  // Buscar separador con dos puntos ":" (ej: "Vibración al frenar: probable disco...")
  const colonIdx = clean.indexOf(":");
  if (colonIdx > 0 && colonIdx <= 45) {
    const title = clean.substring(0, colonIdx).trim();
    const detail = clean.substring(colonIdx + 1).trim();
    return { title, detail: detail || undefined };
  }

  // Separador con guión largo o " — " / " - "
  const dashIdx = clean.search(/\s+[—–-]\s+/);
  if (dashIdx > 0 && dashIdx <= 45) {
    const title = clean.substring(0, dashIdx).trim();
    const rest = clean.substring(dashIdx).replace(/^[\s—–-]+/, "").trim();
    return { title, detail: rest || undefined };
  }

  // Si es muy largo (> 50 chars) y tiene punto
  const dotIdx = clean.indexOf(". ");
  if (dotIdx > 0 && dotIdx <= 40) {
    const title = clean.substring(0, dotIdx).trim();
    const detail = clean.substring(dotIdx + 2).trim();
    return { title, detail: detail || undefined };
  }

  return { title: clean };
}

function parseInitialTags(text: string): StructuredTag[] {
  if (!text || !text.trim()) return [];
  const lines = text
    .split(/\n|•/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  return lines.map(parseTagLine).filter((t) => t.title.length > 0);
}

function serializeTags(tags: StructuredTag[]): string {
  return tags
    .map((t) => {
      const cleanTitle = t.title.trim();
      const cleanDetail = t.detail ? t.detail.trim() : "";
      return cleanDetail ? `• ${cleanTitle}: ${cleanDetail}` : `• ${cleanTitle}`;
    })
    .join("\n");
}

const SUGERENCIAS_TAGS: Record<string, { title: string; defaultDetail: string }[]> = {
  equipamiento: [
    { title: "Capacidad fluido", defaultDetail: "Aceite 15W-40 cárter húmedo 36 L" },
    { title: "Presión de trabajo", defaultDetail: "250 bar (25 MPa)" },
    { title: "Tipo lubricante / grasa", defaultDetail: "Grasa de litio NLGI 2 EP" },
    { title: "Torque de apriete", defaultDetail: "210 Nm en pernos de anclaje" },
    { title: "Temperatura normal", defaultDetail: "82 a 95 °C en régimen de faena" },
  ],
  fallas: [
    { title: "Fuga de aceite o fluido", defaultDetail: "Pérdida por sellos gastados o acoples flojos" },
    { title: "Pérdida de presión / potencia", defaultDetail: "Filtros colmatados o válvula de alivio descalibrada" },
    { title: "Sobrecalentamiento", defaultDetail: "Temperatura sobre 102 °C por enfriador o radiador colmatado" },
    { title: "Ruido o vibración anormal", defaultDetail: "Desgaste en rodamientos o juego excesivo en bujes" },
  ],
  procedimientos: [
    { title: "Bloqueo de seguridad LOTO", defaultDetail: "Aplicar candado en desconectador y purgar presión residual" },
    { title: "Comprobación de nivel", defaultDetail: "Revisar en frío sobre terreno nivelado entre marcas MIN y MAX" },
    { title: "Medición con manómetro calibrado", defaultDetail: "Conectar en toma minimess y comparar con tolerancia OEM" },
    { title: "Purga de aire del circuito", defaultDetail: "Accionar cebador o purga hasta flujo continuo sin burbujas" },
  ],
};

export function FichaTagsField({
  tipo,
  sistemaName,
  initialValue,
}: {
  tipo: FichaTipo;
  sistemaName: string;
  initialValue: string;
}) {
  const [tags, setTags] = useState<StructuredTag[]>(() => parseInitialTags(initialValue));
  const [inputTitle, setInputTitle] = useState("");
  const [inputDetail, setInputDetail] = useState("");
  const [modoLibre, setModoLibre] = useState(false);
  const [rawText, setRawText] = useState(initialValue || "");

  const sugerencias = SUGERENCIAS_TAGS[tipo.slug] || [];

  const config = TIPO_CONFIG[tipo.slug] || {
    label: tipo.name,
    sub: `Información de ${tipo.name.toLowerCase()} para ${sistemaName.toLowerCase()}.`,
    placeholderTitle: `Título corto de ${tipo.name.toLowerCase()}...`,
    placeholderDetail: `Detalle técnico para el Asistente...`,
    badgeCls: "tag-default",
    icon: "📌",
  };

  const agregarTag = () => {
    const titleVal = inputTitle.trim();
    if (!titleVal) return;

    // Si pegó varias líneas
    if (titleVal.includes("\n") || titleVal.includes("•")) {
      const parsed = parseInitialTags(titleVal);
      if (parsed.length > 0) {
        const actualizados = [...tags, ...parsed];
        setTags(actualizados);
        setRawText(serializeTags(actualizados));
        setInputTitle("");
        setInputDetail("");
        return;
      }
    }

    // Si escribió "Título: Detalle" directamente en el primer input
    if (titleVal.includes(":") && !inputDetail.trim()) {
      const parsed = parseTagLine(titleVal);
      const actualizados = [...tags, parsed];
      setTags(actualizados);
      setRawText(serializeTags(actualizados));
      setInputTitle("");
      setInputDetail("");
      return;
    }

    const nuevo: StructuredTag = {
      title: titleVal,
      detail: inputDetail.trim() || undefined,
    };

    const actualizados = [...tags, nuevo];
    setTags(actualizados);
    setRawText(serializeTags(actualizados));
    setInputTitle("");
    setInputDetail("");
  };

  const eliminarTag = (index: number) => {
    const actualizados = tags.filter((_, i) => i !== index);
    setTags(actualizados);
    setRawText(serializeTags(actualizados));
  };

  const cambiarAModoLibre = () => {
    setRawText(serializeTags(tags));
    setModoLibre(true);
  };

  const cambiarAModoTags = () => {
    const nuevosTags = parseInitialTags(rawText);
    setTags(nuevosTags);
    setModoLibre(false);
  };

  const serializedValue = modoLibre ? rawText.trim() : serializeTags(tags);

  return (
    <div className="ficha-field-group ficha-tags-group">
      <div className="ficha-tags-header">
        <div className="ficha-tags-title-area">
          <label>
            <span style={{ marginRight: 6 }}>{config.icon}</span>
            {config.label}
          </label>
          <span className="ficha-tags-count-badge">
            {tags.length} {tags.length === 1 ? "tag" : "tags"}
          </span>
        </div>
        <button
          type="button"
          className="ficha-tags-mode-toggle"
          onClick={() => (modoLibre ? cambiarAModoTags() : cambiarAModoLibre())}
        >
          {modoLibre ? "Volver a vista de tags" : "Editar texto libre"}
        </button>
      </div>

      <p className="ficha-tags-hint">{config.sub}</p>

      {/* Input oculto que envía el contenido serializado para Postgres & Voyage AI */}
      <input type="hidden" name={`campo_${tipo.slug}`} value={serializedValue} />

      {modoLibre ? (
        <div style={{ marginTop: 8 }}>
          <textarea
            rows={5}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder={`Escribe cada tag en una línea (ej: • Título corto: Detalle técnico)`}
            className="ficha-tags-raw-textarea"
          />
          <small style={{ display: "block", color: "var(--text-mid)", marginTop: 6, fontSize: 11.5 }}>
            Usa el formato <b>• Título corto: Detalle técnico</b> para que el título sea el botón en el Asistente y el detalle la explicación.
          </small>
        </div>
      ) : (
        <div className="ficha-tags-body">
          <div className="ficha-tags-list">
            {tags.length === 0 ? (
              <div className="ficha-tags-empty">
                Sin tags agregados. Completa el título y detalle abajo y presiona <b>Enter</b> o <b>+ Agregar tag</b>.
              </div>
            ) : (
              tags.map((tag, idx) => (
                <div key={idx} className={`ficha-tag-chip ${config.badgeCls}`}>
                  <div className="ficha-tag-content">
                    <span className="ficha-tag-title">{tag.title}</span>
                    {tag.detail && (
                      <span className="ficha-tag-detail" title={tag.detail}>
                        : {tag.detail}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="ficha-tag-remove-btn"
                    onClick={() => eliminarTag(idx)}
                    title={`Quitar tag: ${tag.title}`}
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>

          {sugerencias.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 10, padding: "2px 0" }}>
              <span style={{ fontSize: 11.5, color: "var(--text-mid)", marginRight: 2 }}>Sugerencias rápidas:</span>
              {sugerencias.map((sug, sIdx) => (
                <button
                  key={sIdx}
                  type="button"
                  className="field-inline-link"
                  onClick={() => {
                    setInputTitle(sug.title);
                    if (!inputDetail.trim()) setInputDetail(sug.defaultDetail);
                  }}
                  style={{
                    fontSize: 11.5,
                    padding: "3px 8px",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid var(--graphite-line)",
                    borderRadius: 6,
                    color: "var(--text-hi)",
                    cursor: "pointer",
                  }}
                >
                  + {sug.title}
                </button>
              ))}
            </div>
          )}

          <div className="ficha-tags-add-bar">
            <input
              type="text"
              value={inputTitle}
              onChange={(e) => setInputTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  agregarTag();
                }
              }}
              placeholder={config.placeholderTitle}
              className="ficha-tags-input"
              maxLength={60}
            />
            <input
              type="text"
              value={inputDetail}
              onChange={(e) => setInputDetail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  agregarTag();
                }
              }}
              placeholder={config.placeholderDetail}
              className="ficha-tags-input"
            />
            <button
              type="button"
              className="btn-outline ficha-tags-add-btn"
              onClick={agregarTag}
              disabled={!inputTitle.trim()}
            >
              + Agregar tag
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
