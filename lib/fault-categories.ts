import { pool } from "@/lib/db";

export type FaultCategory = { slug: string; name: string };
export type FichaFieldType = { slug: string; name: string };

// "Sistema" del equipo (Frenos, Dirección, Tolva...) — una de las dos
// dimensiones del constructor de ficha técnica (ver FichaFieldType, la otra).
export async function listarCategoriasFalla(tenantId: string): Promise<FaultCategory[]> {
  const result = await pool.query<FaultCategory>(
    `select slug, name from fault_categories where tenant_id = $1 order by created_at asc`,
    [tenantId]
  );
  return result.rows;
}

// Tipo de información dentro de cada sistema (Equipamiento, Fallas
// principales, Procedimientos...) — la otra dimensión: Sistema × Tipo de
// ficha = una celda = un documento indexado aparte.
export async function listarTiposFicha(tenantId: string): Promise<FichaFieldType[]> {
  const result = await pool.query<FichaFieldType>(
    `select slug, name from ficha_field_types where tenant_id = $1 order by created_at asc`,
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
