"use client";

import { useState } from "react";

// Antes era un input de texto libre con datalist — cualquier variación de
// escritura quedaba como un "tipo" distinto. Ahora es un select real; agregar
// un tipo nuevo no necesita una pantalla aparte: se escribe acá y el server
// action lo suma al catálogo del tenant (ver actualizarActivo/crearActivo en
// app/admin/assets/actions.ts), así que la próxima vez ya aparece en la lista.
const NUEVO = "__nuevo__";

export function AssetTypeSelect({ options, defaultValue }: { options: string[]; defaultValue?: string | null }) {
  const [modoNuevo, setModoNuevo] = useState(false);

  // Si el activo ya tiene un tipo que no está en el catálogo (dato viejo
  // escrito a mano antes de este cambio), se agrega para que no desaparezca
  // de la vista al editar — igual queda seleccionado.
  const allOptions = defaultValue && !options.includes(defaultValue) ? [defaultValue, ...options] : options;

  if (modoNuevo) {
    return (
      <>
        <div className="input-wrap">
          <input name="asset_type" autoFocus placeholder="Nombre del nuevo tipo" />
        </div>
        <button type="button" className="field-inline-link" onClick={() => setModoNuevo(false)}>
          Elegir de la lista
        </button>
      </>
    );
  }

  return (
    <div className="input-wrap">
      <select
        name="asset_type"
        defaultValue={defaultValue || ""}
        onChange={(e) => {
          if (e.target.value === NUEVO) setModoNuevo(true);
        }}
      >
        <option value="">Sin especificar</option>
        {allOptions.map((tipo) => (
          <option key={tipo} value={tipo}>
            {tipo}
          </option>
        ))}
        <option value={NUEVO}>+ Agregar nuevo tipo…</option>
      </select>
    </div>
  );
}
