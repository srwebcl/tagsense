import { pool } from "@/lib/db";

export type FaultCategory = { slug: string; name: string };

export async function listarCategoriasFalla(tenantId: string): Promise<FaultCategory[]> {
  const result = await pool.query<FaultCategory>(
    `select slug, name from fault_categories where tenant_id = $1 order by created_at asc`,
    [tenantId]
  );
  return result.rows;
}

// El admin escribe el nombre ("Neumáticos") y se deriva un slug estable para
// guardar/matchear (sin tildes, minúsculas, guiones) — mismo criterio simple
// que ya usa el resto del proyecto para tag_code/ids legibles.
export function slugificar(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
