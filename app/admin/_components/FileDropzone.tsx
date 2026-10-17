"use client";

import { useRef, useState } from "react";

// Se ve como una zona de arrastrar-y-soltar (borde punteado, ícono de flecha hacia
// abajo) pero antes no tenía ningún manejo de onDrop/onDragOver — dependía por
// completo de que el navegador soltara el archivo directamente sobre el
// <input type="file"> invisible (opacity:0) que cubre la caja. Eso es poco
// confiable entre navegadores/SO (a veces el drop no llega al input, sin ningún
// aviso de error), y además la caja nunca cambiaba de aspecto durante el
// arrastre, así que no había forma de saber si realmente iba a funcionar.
// Ahora el drop se maneja a mano y se asigna al input vía DataTransfer, para que
// FormData lo lea igual que si se hubiera elegido con el selector nativo.
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
  const inputRef = useRef<HTMLInputElement>(null);

  const asignarArchivo = (file: File | undefined | null) => {
    if (!file || !inputRef.current) return;
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    inputRef.current.files = dataTransfer.files;
    setFileName(file.name);
  };

  return (
    <div
      className={`dropzone${arrastrando ? " dropzone-active" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setArrastrando(true);
      }}
      onDragLeave={() => setArrastrando(false)}
      onDrop={(e) => {
        e.preventDefault();
        setArrastrando(false);
        asignarArchivo(e.dataTransfer.files?.[0]);
      }}
    >
      <div className="ic">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M12 3v12m0 0 4-4m-4 4-4-4M5 19h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="txt">
        <strong>{fileName || (arrastrando ? "Soltar acá" : label)}</strong>
        <small>{fileName ? "Toca para cambiarlo" : hint}</small>
      </div>
      <input
        ref={inputRef}
        type="file"
        name={name}
        accept={accept}
        required={required}
        onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
      />
    </div>
  );
}
