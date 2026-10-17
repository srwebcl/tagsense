import { auth } from "@/lib/auth/server";
import { pool } from "@/lib/db";

export type AppUser = {
  id: string;
  tenant_id: string;
  role: "technician" | "maintainer" | "admin";
  full_name: string | null;
  email: string;
};

// Puente entre la identidad de Neon Auth (schema neon_auth, solo sabe quién es
// el usuario) y nuestra tabla de negocio `users` (schema public, sabe a qué
// tenant pertenece y con qué rol). Un usuario puede existir en Neon Auth y aún
// no tener fila en `users` — en ese caso no pertenece a ningún tenant todavía.
//
// Esta consulta resuelve el tenant SOLO por email, sin más contexto (no puede
// tener otro: la sesión todavía no sabe a qué tenant pertenece, eso es
// justamente lo que esta función tiene que resolver). Por eso `users.email`
// es único a nivel global (ver migración 0009), no solo por tenant — sin esa
// garantía, un mismo correo en dos tenants haría que `limit 1` devolviera una
// fila u otra de forma no determinística, dejando a alguien trabajando contra
// el tenant equivocado sin ningún aviso. Si en el futuro se necesita que una
// misma persona pertenezca a más de un tenant, esto requiere un selector de
// tenant explícito en el login — no basta con relajar la constraint.
export async function getCurrentAppUser(): Promise<AppUser | null> {
  const { data: session } = await auth.getSession();
  if (!session?.user?.email) return null;

  const result = await pool.query<AppUser>(
    `select id, tenant_id, role, full_name, email
     from users
     where email = $1
     limit 1`,
    [session.user.email]
  );
  return result.rows[0] ?? null;
}
