import { requireAdmin } from "@/lib/require-admin";
import { crearActivo } from "@/app/admin/assets/actions";

export default async function NewAssetPage() {
  await requireAdmin();

  return (
    <div className="mx-auto max-w-lg px-6 py-10">
      <h1 className="mb-6 text-xl font-bold">Nuevo activo</h1>
      <form action={crearActivo} className="flex flex-col gap-3">
        <label className="text-sm font-medium">
          Código del tag (QR/NFC) *
          <input name="tag_code" required className="mt-1 w-full rounded border px-3 py-2" placeholder="TS-CAEX-0000126" />
        </label>
        <label className="text-sm font-medium">
          Nombre *
          <input name="name" required className="mt-1 w-full rounded border px-3 py-2" placeholder="Camión Minero MT65S" />
        </label>
        <label className="text-sm font-medium">
          Modelo
          <input name="model" className="mt-1 w-full rounded border px-3 py-2" />
        </label>
        <label className="text-sm font-medium">
          N° de serie
          <input name="serial_number" className="mt-1 w-full rounded border px-3 py-2" />
        </label>
        <label className="text-sm font-medium">
          Ubicación
          <input name="location" className="mt-1 w-full rounded border px-3 py-2" />
        </label>
        <label className="text-sm font-medium">
          Estado
          <select name="status" defaultValue="operativo" className="mt-1 w-full rounded border px-3 py-2">
            <option value="operativo">Operativo</option>
            <option value="mantenimiento">Mantención</option>
            <option value="fuera_de_servicio">Fuera de servicio</option>
          </select>
        </label>
        <button type="submit" className="mt-2 rounded bg-black px-4 py-2 text-white">
          Crear activo
        </button>
      </form>
    </div>
  );
}
