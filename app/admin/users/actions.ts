"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/require-admin";
import { pool } from "@/lib/db";
import { auth } from "@/lib/auth/server";

const ROLES = ["admin", "technician", "maintainer"] as const;
type Rol = (typeof ROLES)[number];

function esRolValido(valor: string): valor is Rol {
  return (ROLES as readonly string[]).includes(valor);
}

function generarContrasenaSegura(): string {
  // Sin 0/O/1/l/I para que no se confundan al transcribirla a mano en terreno.
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 16; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

export type EstadoCrearUsuario = { error?: string; exito?: { email: string; password: string } };

// La contraseña se genera acá, no la escribe el admin — así queda garantizado
// que es segura desde el momento en que se crea la cuenta (ver pedido del
// usuario: "dejar una segura").
export async function crearUsuario(_prevState: EstadoCrearUsuario, formData: FormData): Promise<EstadoCrearUsuario> {
  const appUser = await requireAdmin();

  const email = String(formData.get("email") || "").trim().toLowerCase();
  const fullName = String(formData.get("full_name") || "").trim();
  const role = String(formData.get("role") || "technician");

  if (!email || !fullName) {
    return { error: "Correo y nombre son obligatorios." };
  }
  if (!esRolValido(role)) {
    return { error: "Rol inválido." };
  }

  // email único a nivel global (ver migración 0009) — se confirma ANTES de
  // crear la identidad en Neon Auth, para no dejar una cuenta de login
  // huérfana sin acceso a ningún tenant si este chequeo se hiciera después.
  const existe = await pool.query(`select id from users where email = $1 limit 1`, [email]);
  if (existe.rows[0]) {
    return { error: `Ya existe un usuario con el correo "${email}".` };
  }

  const password = generarContrasenaSegura();

  // El cliente de @neondatabase/auth NO lanza excepción en errores HTTP (403,
  // 500, etc.) — devuelve { data, error } y resuelve igual. Antes esto no se
  // revisaba: una llamada rechazada (ej. 403 por falta del rol admin de
  // Better Auth) pasaba como "éxito" silencioso y dejaba una fila en `users`
  // sin ninguna cuenta de login real detrás (confirmado en vivo, con
  // qa-playwright-temp@tagsense.cl). Por eso se revisa `error` explícitamente.
  const { error: errorCrearAuth } = await auth.admin.createUser({ email, password, name: fullName });
  if (errorCrearAuth) {
    console.error("[crearUsuario] error al crear la identidad en Neon Auth:", errorCrearAuth);
    if (errorCrearAuth.code === "user_already_exists") {
      return { error: `Ya existe una cuenta de acceso con el correo "${email}" (de otro tenant o un intento anterior).` };
    }
    return { error: "No se pudo crear el usuario. Intenta de nuevo." };
  }

  try {
    await pool.query(
      `insert into users (tenant_id, email, role, full_name) values ($1, $2, $3, $4)`,
      [appUser.tenant_id, email, role, fullName]
    );
  } catch (err) {
    console.error("[crearUsuario] la identidad se creó en Neon Auth pero falló el alta en TAGSENSE:", err);
    return { error: "La cuenta de acceso se creó, pero no se pudo asociar a TAGSENSE. Avisa a soporte antes de reintentar (el correo ya está tomado)." };
  }

  revalidatePath("/admin/users");
  return { exito: { email, password } };
}

export async function cambiarRolUsuario(userId: string, nuevoRol: string) {
  const appUser = await requireAdmin();
  if (userId === appUser.id) {
    throw new Error("No puedes cambiar tu propio rol.");
  }
  if (!esRolValido(nuevoRol)) {
    throw new Error("Rol inválido.");
  }
  await pool.query(`update users set role = $1 where tenant_id = $2 and id = $3`, [nuevoRol, appUser.tenant_id, userId]);
  revalidatePath("/admin/users");
}

export async function quitarAccesoUsuario(userId: string) {
  const appUser = await requireAdmin();
  if (userId === appUser.id) {
    throw new Error("No puedes quitarte el acceso a ti mismo.");
  }
  await pool.query(`delete from users where tenant_id = $1 and id = $2`, [appUser.tenant_id, userId]);
  revalidatePath("/admin/users");
}

// Genera una contraseña nueva y la aplica directo en Neon Auth — el admin no
// elige la contraseña del otro usuario, solo dispara el reseteo y se la pasa
// por el canal que prefiera (no queda guardada en ningún lado después de esto).
export async function resetearContrasenaUsuario(userId: string): Promise<string> {
  const appUser = await requireAdmin();

  const result = await pool.query(`select email from users where tenant_id = $1 and id = $2 limit 1`, [appUser.tenant_id, userId]);
  const fila = result.rows[0];
  if (!fila) {
    throw new Error("Usuario no encontrado.");
  }

  const authUserResult = await pool.query(`select id from neon_auth."user" where email = $1 limit 1`, [fila.email]);
  const authUser = authUserResult.rows[0];
  if (!authUser) {
    throw new Error("No se encontró la cuenta de acceso para este correo.");
  }

  const nuevaContrasena = generarContrasenaSegura();
  const { error: errorReset } = await auth.admin.setUserPassword({ userId: authUser.id, newPassword: nuevaContrasena });
  if (errorReset) {
    console.error("[resetearContrasenaUsuario] error al resetear la contraseña en Neon Auth:", errorReset);
    throw new Error("No se pudo resetear la contraseña. Intenta de nuevo.");
  }
  return nuevaContrasena;
}
