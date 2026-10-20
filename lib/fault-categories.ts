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

// Componentes ACTIVOS para un activo en particular — un camión tiene tolva,
// una bomba no; una pala tiene balde, un camión no. fault_categories sigue
// siendo el catálogo de opciones disponibles para elegir o crear; esta
// consulta es la que realmente arma el sidebar de la ficha técnica y los
// tiles del Asistente de campo para ESE activo puntual.
export async function listarComponentesDeActivo(tenantId: string, assetId: string): Promise<FaultCategory[]> {
  const result = await pool.query<FaultCategory>(
    `select fc.slug, fc.name
     from asset_components ac
     join fault_categories fc on fc.tenant_id = ac.tenant_id and fc.slug = ac.category_slug
     where ac.tenant_id = $1 and ac.asset_id = $2
     order by ac.created_at asc`,
    [tenantId, assetId]
  );
  return result.rows;
}

// Plantilla de sistemas que corresponde a un TIPO de activo (Camión Minero,
// Pala Cargadora...) — distinto de listarComponentesDeActivo: esto es la
// correlación general tipo -> sistemas, editable en /admin/categorias. Al
// crear un activo de este tipo, su contenido se copia a asset_components
// para ese activo en particular (ver crearActivo).
export async function listarSlugsDeTipoDeActivo(tenantId: string, assetType: string): Promise<string[]> {
  const result = await pool.query<{ category_slug: string }>(
    `select category_slug from asset_type_components where tenant_id = $1 and asset_type = $2`,
    [tenantId, assetType]
  );
  return result.rows.map((r) => r.category_slug);
}

// Todas las plantillas del tenant de una sola vez, agrupadas por tipo —
// para pintar la pantalla de Categorías sin una consulta por tipo.
export async function listarPlantillasPorTipo(tenantId: string): Promise<Record<string, string[]>> {
  const result = await pool.query<{ asset_type: string; category_slug: string }>(
    `select asset_type, category_slug from asset_type_components where tenant_id = $1`,
    [tenantId]
  );
  const porTipo: Record<string, string[]> = {};
  for (const fila of result.rows) {
    (porTipo[fila.asset_type] ||= []).push(fila.category_slug);
  }
  return porTipo;
}

// Cuántos activos tiene cada tipo — se muestra en /admin/categorias para que
// la lista se vea como un catálogo real en uso, no solo nombres sueltos.
export async function contarActivosPorTipo(tenantId: string): Promise<Record<string, number>> {
  const result = await pool.query<{ asset_type: string; total: string }>(
    `select asset_type, count(*)::int as total from assets where tenant_id = $1 and asset_type is not null group by asset_type`,
    [tenantId]
  );
  return Object.fromEntries(result.rows.map((r) => [r.asset_type, Number(r.total)]));
}

// Cuántos activos tienen cada sistema activo en su ficha técnica.
export async function contarActivosPorSistema(tenantId: string): Promise<Record<string, number>> {
  const result = await pool.query<{ category_slug: string; total: string }>(
    `select category_slug, count(*)::int as total from asset_components where tenant_id = $1 group by category_slug`,
    [tenantId]
  );
  return Object.fromEntries(result.rows.map((r) => [r.category_slug, Number(r.total)]));
}

// Cuántos documentos de ficha técnica usan cada sección (Equipamiento, Fallas...).
export async function contarDocumentosPorTipoFicha(tenantId: string): Promise<Record<string, number>> {
  const result = await pool.query<{ field_type_slug: string; total: string }>(
    `select field_type_slug, count(*)::int as total from asset_documents
     where tenant_id = $1 and field_type_slug is not null group by field_type_slug`,
    [tenantId]
  );
  return Object.fromEntries(result.rows.map((r) => [r.field_type_slug, Number(r.total)]));
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
