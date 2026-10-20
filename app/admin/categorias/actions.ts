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
