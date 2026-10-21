"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/require-admin";
import { pool } from "@/lib/db";
import { slugificar } from "@/lib/fault-categories";

// Catálogo de sistemas del equipo (Frenos, Dirección...) — tenant-wide, crece
// desde esta misma pantalla. Ver app/admin/assets/[id]/ficha para dónde se usa.
export async function crearCategoriaFalla(formData: FormData) {
  const appUser = await requireAdmin();

  const nombre = String(formData.get("nombre_categoria") || "").trim();
  if (!nombre) {
    throw new Error("Falta el nombre del sistema.");
  }
  const slug = slugificar(nombre);
  if (!slug) {
    throw new Error("El nombre no es válido.");
  }

  await pool.query(
    `insert into fault_categories (tenant_id, slug, name) values ($1, $2, $3) on conflict (tenant_id, slug) do nothing`,
    [appUser.tenant_id, slug, nombre]
  );

  revalidatePath("/admin/categorias");
  redirect("/admin/categorias");
}

// Catálogo de tipos de ficha (Equipamiento, Fallas principales,
// Procedimientos...) — la otra dimensión del constructor de ficha técnica.
export async function crearTipoFicha(formData: FormData) {
  const appUser = await requireAdmin();

  const nombre = String(formData.get("nombre_tipo") || "").trim();
  if (!nombre) {
    throw new Error("Falta el nombre del tipo de ficha.");
  }
  const slug = slugificar(nombre);
  if (!slug) {
    throw new Error("El nombre no es válido.");
  }

  await pool.query(
    `insert into ficha_field_types (tenant_id, slug, name) values ($1, $2, $3) on conflict (tenant_id, slug) do nothing`,
    [appUser.tenant_id, slug, nombre]
  );

  revalidatePath("/admin/categorias");
  redirect("/admin/categorias");
}

// Catálogo de tipos de activo (Camión articulado, Pala cargadora...) — ya
// existía (crece también desde el formulario de crear/editar activo, ver
// AssetTypeSelect), se agrega acá para tener un solo lugar donde ver y
// administrar los tres catálogos del sistema.
export async function crearTipoDeActivo(formData: FormData) {
  const appUser = await requireAdmin();

  const nombre = String(formData.get("nombre_tipo_activo") || "").trim();
  if (!nombre) {
    throw new Error("Falta el nombre del tipo de activo.");
  }

  await pool.query(
    `insert into asset_types (tenant_id, name) values ($1, $2) on conflict (tenant_id, name) do nothing`,
    [appUser.tenant_id, nombre]
  );

  revalidatePath("/admin/categorias");
  redirect("/admin/categorias");
}

// Marca o desmarca un sistema en la plantilla de un tipo de activo — esta es
// la correlación que define qué sistemas trae un activo nuevo de este tipo
// al crearlo (ver crearActivo en app/admin/assets/actions.ts). No toca los
// activos que ya existen, solo la plantilla para los que se creen de ahora
// en adelante.
export async function alternarComponenteDeTipo(assetType: string, categorySlug: string, activar: boolean) {
  const appUser = await requireAdmin();

  if (activar) {
    await pool.query(
      `insert into asset_type_components (tenant_id, asset_type, category_slug) values ($1, $2, $3)
       on conflict (tenant_id, asset_type, category_slug) do nothing`,
      [appUser.tenant_id, assetType, categorySlug]
    );
  } else {
    await pool.query(
      `delete from asset_type_components where tenant_id = $1 and asset_type = $2 and category_slug = $3`,
      [appUser.tenant_id, assetType, categorySlug]
    );
  }

  revalidatePath("/admin/categorias");
}

// Borrar no falla aunque el catálogo esté en uso (mismo criterio que
// WordPress con categorías de posts): los activos/documentos que ya tenían
// ese valor lo conservan como dato histórico, solo deja de aparecer como
// opción para elegir de ahora en adelante.
export async function eliminarCategoriaFalla(slug: string) {
  const appUser = await requireAdmin();
  await pool.query(`delete from fault_categories where tenant_id = $1 and slug = $2`, [appUser.tenant_id, slug]);
  await pool.query(`delete from asset_type_components where tenant_id = $1 and category_slug = $2`, [appUser.tenant_id, slug]);
  revalidatePath("/admin/categorias");
}

export async function editarCategoriaFalla(slug: string, nuevoNombre: string) {
  const appUser = await requireAdmin();
  const nombre = nuevoNombre.trim();
  if (!nombre) {
    throw new Error("El nombre no puede estar vacío.");
  }
  await pool.query(
    `update fault_categories set name = $3 where tenant_id = $1 and slug = $2`,
    [appUser.tenant_id, slug, nombre]
  );
  revalidatePath("/admin/categorias");
}

export async function eliminarTipoFicha(slug: string) {
  const appUser = await requireAdmin();
  await pool.query(`delete from ficha_field_types where tenant_id = $1 and slug = $2`, [appUser.tenant_id, slug]);
  revalidatePath("/admin/categorias");
}

export async function editarTipoFicha(slug: string, nuevoNombre: string) {
  const appUser = await requireAdmin();
  const nombre = nuevoNombre.trim();
  if (!nombre) {
    throw new Error("El nombre no puede estar vacío.");
  }
  await pool.query(
    `update ficha_field_types set name = $3 where tenant_id = $1 and slug = $2`,
    [appUser.tenant_id, slug, nombre]
  );
  revalidatePath("/admin/categorias");
}

export async function eliminarTipoDeActivo(nombre: string) {
  const appUser = await requireAdmin();
  await pool.query(`delete from asset_types where tenant_id = $1 and name = $2`, [appUser.tenant_id, nombre]);
  await pool.query(`delete from asset_type_components where tenant_id = $1 and asset_type = $2`, [appUser.tenant_id, nombre]);
  revalidatePath("/admin/categorias");
}

export async function editarTipoDeActivo(nombreActual: string, nuevoNombre: string) {
  const appUser = await requireAdmin();
  const nuevo = nuevoNombre.trim();
  if (!nuevo) {
    throw new Error("El nombre del tipo no puede estar vacío.");
  }
  if (nuevo === nombreActual) return;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `insert into asset_types (tenant_id, name) values ($1, $2) on conflict (tenant_id, name) do nothing`,
      [appUser.tenant_id, nuevo]
    );
    await client.query(
      `update assets set asset_type = $3 where tenant_id = $1 and asset_type = $2`,
      [appUser.tenant_id, nombreActual, nuevo]
    );
    await client.query(
      `update asset_type_components set asset_type = $3 where tenant_id = $1 and asset_type = $2`,
      [appUser.tenant_id, nombreActual, nuevo]
    );
    await client.query(
      `delete from asset_types where tenant_id = $1 and name = $2`,
      [appUser.tenant_id, nombreActual]
    );
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
  revalidatePath("/admin/categorias");
  revalidatePath("/admin");
}

