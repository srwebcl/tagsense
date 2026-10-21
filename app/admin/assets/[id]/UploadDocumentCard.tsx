"use client";

import { useState } from "react";
import { SubmitButton } from "@/app/admin/_components/SubmitButton";
import { FileDropzone } from "@/app/admin/_components/FileDropzone";

export function UploadDocumentCard({
  action,
  hasDocuments,
}: {
  action: (formData: FormData) => Promise<void>;
  hasDocuments: boolean;
}) {
  const [isOpen, setIsOpen] = useState(!hasDocuments);

  return (
    <div style={{ marginTop: 12, marginBottom: 28 }}>
      {!isOpen ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="btn-outline"
          style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Subir documento PDF
        </button>
      ) : (
        <div className="upload-doc-card">
          <div className="upload-doc-head">
            <div>
              <h3>Subir documento técnico (PDF)</h3>
              <p>El manual o procedimiento se asociará a este activo y se indexará para el Asistente IA.</p>
            </div>
            {hasDocuments && (
              <button
                type="button"
                className="field-inline-link"
                onClick={() => setIsOpen(false)}
                style={{ fontSize: 12 }}
              >
                Cancelar
              </button>
            )}
          </div>

          <form action={action}>
            <div className="upload-doc-grid">
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div className="field" style={{ margin: 0 }}>
                  <label>
                    Título del documento <span className="req">*</span>
                  </label>
                  <div className="input-wrap">
                    <input
                      name="title"
                      required
                      placeholder="Ej: Manual de Operación y Mantenimiento"
                    />
                  </div>
                </div>

                <div className="field" style={{ margin: 0 }}>
                  <label>Tipo de documento</label>
                  <div className="chip-group">
                    <input type="radio" name="document_type" id="dt-op" value="operacion" defaultChecked />
                    <label htmlFor="dt-op">Operación</label>
                    <input type="radio" name="document_type" id="dt-sv" value="servicio" />
                    <label htmlFor="dt-sv">Servicio</label>
                    <input type="radio" name="document_type" id="dt-rp" value="reparacion" />
                    <label htmlFor="dt-rp">Reparación</label>
                    <input type="radio" name="document_type" id="dt-pt" value="partes" />
                    <label htmlFor="dt-pt">Partes</label>
                  </div>
                </div>
              </div>

              <div>
                <div className="field" style={{ margin: 0 }}>
                  <label>
                    Archivo (PDF) <span className="req">*</span>
                  </label>
                  <FileDropzone
                    name="file"
                    accept="application/pdf"
                    label="Seleccionar archivo PDF"
                    hint="Manual OEM, plano, pauta de inspección..."
                  />
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14 }}>
              <SubmitButton>Subir e indexar documento</SubmitButton>
              {hasDocuments && (
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => setIsOpen(false)}
                  style={{ height: 44 }}
                >
                  Cerrar
                </button>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
