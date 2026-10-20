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
