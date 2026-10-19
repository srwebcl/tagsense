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

// Mismo espíritu que AssetTypeSelect: el catálogo de categorías de falla crece
// desde este mismo formulario, sin pantalla de administración aparte.
export function NuevaCategoriaForm({ action }: { action: (formData: FormData) => Promise<void> }) {
  const [abierto, setAbierto] = useState(false);

  if (!abierto) {
    return (
      <button type="button" className="field-inline-link" onClick={() => setAbierto(true)}>
        + Agregar categoría nueva
      </button>
    );
  }

  return (
    <form action={action} style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
      <div className="field" style={{ marginBottom: 0, flex: 1, minWidth: 180 }}>
        <label>Nombre de la categoría</label>
        <div className="input-wrap">
          <input name="nombre_categoria" autoFocus required placeholder="Ej: Neumáticos" />
        </div>
      </div>
      <BotonAgregar />
      <button type="button" className="field-inline-link" onClick={() => setAbierto(false)}>
        Cancelar
      </button>
    </form>
  );
}
