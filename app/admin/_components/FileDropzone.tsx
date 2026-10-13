"use client";

import { useState } from "react";

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

  return (
    <div className="dropzone">
      <div className="ic">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M12 3v12m0 0 4-4m-4 4-4-4M5 19h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="txt">
        <strong>{fileName || label}</strong>
        <small>{fileName ? "Toca para cambiarlo" : hint}</small>
      </div>
      <input
        type="file"
        name={name}
        accept={accept}
        required={required}
        onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
      />
    </div>
  );
}
