"use client";

import { useRef, useState } from "react";
import { compressImage } from "@/lib/client-image-compression";

// Se ve como una zona de arrastrar-y-soltar (borde punteado, ícono de flecha hacia
// abajo). Maneja onDrop/onDragOver y onChange para asignar el archivo vía DataTransfer.
// Si el archivo seleccionado es una imagen, lo comprime y redimensiona en el navegador
// (Canvas/WebP) antes de subirlo, logrando una reducción de ~95% del peso sin costo de Vercel.
export function FileDropzone({
  name,
  accept,
  required = true,
  label = "Elegir archivo PDF",
  hint = "Manual, ficha técnica, procedimiento, etc.",
}: {
  name: string;
  accept?: string;
  required?: boolean;
  label?: string;
  hint?: string;
}) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [optimizando, setOptimizando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const procesarArchivo = async (file: File | undefined | null) => {
    if (!file || !inputRef.current) return;
    let finalFile = file;

    const esImagen = file.type.startsWith("image/") || (accept && accept.includes("image"));
    if (esImagen) {
      setOptimizando(true);
      try {
        finalFile = await compressImage(file);
      } catch (err) {
        console.warn("No se pudo comprimir la imagen en el cliente:", err);
        finalFile = file;
      } finally {
        setOptimizando(false);
      }
    }

    try {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(finalFile);
      inputRef.current.files = dataTransfer.files;
    } catch {
      // Fallback para entornos que restrinjan reasignación de DataTransfer
    }

    const kbOriginal = Math.round(file.size / 1024);
    const kbFinal = Math.round(finalFile.size / 1024);
    if (kbFinal < kbOriginal) {
      const ahorro = Math.round((1 - kbFinal / kbOriginal) * 100);
      setFileName(`${finalFile.name} (${kbFinal} KB · optimizada -${ahorro}%)`);
    } else {
      setFileName(`${finalFile.name} (${kbFinal} KB)`);
    }
  };

  return (
    <div
      className={`dropzone${arrastrando ? " dropzone-active" : ""}${optimizando ? " dropzone-optimizing" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setArrastrando(true);
      }}
      onDragLeave={() => setArrastrando(false)}
      onDrop={(e) => {
        e.preventDefault();
        setArrastrando(false);
        procesarArchivo(e.dataTransfer.files?.[0]);
      }}
    >
      <div className="ic">
        {optimizando ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="spin-fast">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeDasharray="32" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M12 3v12m0 0 4-4m-4 4-4-4M5 19h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <div className="txt">
        <strong>
          {optimizando ? "Optimizando imagen..." : fileName || (arrastrando ? "Soltar acá" : label)}
        </strong>
        <small>
          {optimizando ? "Reduciendo tamaño para carga instantánea..." : fileName ? "Toca para cambiarlo" : hint}
        </small>
      </div>
      <input
        ref={inputRef}
        type="file"
        name={name}
        accept={accept}
        required={required}
        disabled={optimizando}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            procesarArchivo(file);
          } else {
            setFileName(null);
          }
        }}
      />
    </div>
  );
}
