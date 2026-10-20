"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

function BotonAgregar() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-outline" disabled={pending} style={{ flexShrink: 0 }}>
      {pending ? "Agregando…" : "Agregar"}
    </button>
  );
}

// Formulario genérico para hacer crecer un catálogo tenant-wide (sistemas,
// tipos de ficha, etc.) desde /admin/categorias — mismo espíritu que
// AssetTypeSelect: el catálogo crece desde el punto de uso.
export function NuevaCategoriaForm({
  action,
  fieldName,
  label,
  placeholder,
  linkLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  fieldName: string;
  label: string;
  placeholder: string;
  linkLabel: string;
}) {
  const [abierto, setAbierto] = useState(false);

  if (!abierto) {
    return (
      <button type="button" className="field-inline-link" onClick={() => setAbierto(true)}>
        {linkLabel}
      </button>
    );
  }

  return (
    <form action={action} style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
      <div className="field" style={{ marginBottom: 0, flex: 1, minWidth: 180 }}>
        <label>{label}</label>
        <div className="input-wrap">
          <input name={fieldName} autoFocus required placeholder={placeholder} />
        </div>
      </div>
      <BotonAgregar />
      <button type="button" className="field-inline-link" onClick={() => setAbierto(false)}>
        Cancelar
      </button>
    </form>
  );
}
