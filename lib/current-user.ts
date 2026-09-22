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
