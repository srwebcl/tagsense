"use client";

import { useState, useTransition } from "react";
import { useFormStatus } from "react-dom";

type Item = { key: string; label: string; count: number };

function BotonAgregar() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-outline" disabled={pending} style={{ flexShrink: 0 }}>
      {pending ? "Agregando…" : "Agregar"}
    </button>
  );
}

function FilaEliminar({ item, unidad, onEliminar }: { item: Item; unidad: string; onEliminar: () => Promise<void> }) {
  const [pending, startTransition] = useTransition();

  return (
    <tr className="catalogo-row">
      <td className="catalogo-row-nombre">{item.label}</td>
      <td className="catalogo-row-uso">
        {item.count > 0 ? `${item.count} ${unidad}${item.count === 1 ? "" : "s"}` : <span className="catalogo-sin-uso">sin uso</span>}
      </td>
      <td className="catalogo-row-acciones">
        <button
          type="button"
          className="catalogo-eliminar"
          disabled={pending}
          onClick={() => {
            const aviso =
              item.count > 0
                ? `"${item.label}" está en uso por ${item.count} ${unidad}${item.count === 1 ? "" : "s"}. Lo que ya existe no cambia, pero deja de estar disponible para elegir. ¿Eliminar igual?`
                : `¿Eliminar "${item.label}"?`;
            if (!window.confirm(aviso)) return;
            startTransition(onEliminar);
          }}
        >
          Eliminar
        </button>
      </td>
    </tr>
  );
}

export function CatalogoTabla({
  items,
  unidad,
  fieldName,
  placeholder,
  crearAction,
  eliminarAction,
}: {
  items: Item[];
  unidad: string;
  fieldName: string;
  placeholder: string;
  crearAction: (formData: FormData) => Promise<void>;
  eliminarAction: (key: string) => Promise<void>;
}) {
  const [lista, setLista] = useState(items);

  return (
    <div className="catalogo-tabla-wrap">
      <table className="catalogo-tabla">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>En uso</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {lista.map((item) => (
            <FilaEliminar
              key={item.key}
              item={item}
              unidad={unidad}
              onEliminar={async () => {
                setLista((prev) => prev.filter((i) => i.key !== item.key));
                await eliminarAction(item.key);
              }}
            />
          ))}
          {lista.length === 0 ? (
            <tr>
              <td colSpan={3} className="catalogo-vacio">
                Todavía no hay ninguno.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>

      <form action={crearAction} className="catalogo-form-nuevo">
        <input name={fieldName} required placeholder={placeholder} />
        <BotonAgregar />
      </form>
    </div>
  );
}
