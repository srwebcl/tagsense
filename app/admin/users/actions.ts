"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/require-admin";
import { pool } from "@/lib/db";
import { auth } from "@/lib/auth/server";
import { esRolValido } from "@/lib/roles";

import crypto from "node:crypto";

function generarContrasenaSegura(): string {
  // Sin 0/O/1/l/I para que no se confundan al transcribirla a mano en terreno.
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 16; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

function hashPasswordScrypt(password: string): Promise<string> {
  const config = { N: 16384, r: 16, p: 1, dkLen: 64 };
  const salt = crypto.randomBytes(16).toString("hex");
  return new Promise((resolve, reject) => {
    crypto.scrypt(
      password.normalize("NFKC"),
      salt,
      config.dkLen,
      { N: config.N, r: config.r, p: config.p, maxmem: 128 * config.N * config.r * 2 },
      (err, key) => {
        if (err) reject(err);
        else resolve(`${salt}:${key.toString("hex")}`);
      }
    );
  });
}

export type EstadoCrearUsuario = { error?: string; exito?: { email: string; password: string } };

// Permite al admin ingresar una contraseña personalizada o autogenerar una segura
export async function crearUsuario(_prevState: EstadoCrearUsuario, formData: FormData): Promise<EstadoCrearUsuario> {
  const appUser = await requireAdmin();

  const email = String(formData.get("email") || "").trim().toLowerCase();
  const fullName = String(formData.get("full_name") || "").trim();
  const role = String(formData.get("role") || "technician");
  const customPassword = String(formData.get("password") || "").trim();

  if (!email || !fullName) {
    return { error: "Correo y nombre son obligatorios." };
  }
  if (!esRolValido(role)) {
    return { error: "Rol inválido." };
  }
  if (customPassword && customPassword.length < 8) {
    return { error: "La contraseña personalizada debe tener al menos 8 caracteres." };
  }

  // email único a nivel global (ver migración 0009) — se confirma ANTES de
  // crear la identidad en Neon Auth, para no dejar una cuenta de login
  // huérfana sin acceso a ningún tenant si este chequeo se hiciera después.
  const existe = await pool.query(`select id from users where email = $1 limit 1`, [email]);
  if (existe.rows[0]) {
    return { error: `Ya existe un usuario con el correo "${email}".` };
  }

  const password = customPassword || generarContrasenaSegura();

  const { error: errorCrearAuth } = await auth.admin.createUser({ email, password, name: fullName });
  if (errorCrearAuth) {
    console.error("[crearUsuario] error al crear la identidad en Neon Auth:", errorCrearAuth);
    if (errorCrearAuth.code === "user_already_exists") {
      return { error: `Ya existe una cuenta de acceso con el correo "${email}" (de otro tenant o un intento anterior).` };
    }
    // Fallback: creación directa en tablas de neon_auth con hash scrypt
    try {
      const hashed = await hashPasswordScrypt(password);
      const userRes = await pool.query(
        `insert into neon_auth."user" (id, email, name, role, "emailVerified", "createdAt", "updatedAt")
         values (gen_random_uuid(), $1, $2, 'user', false, NOW(), NOW())
         returning id`,
        [email, fullName]
      );
      const newAuthId = userRes.rows[0].id;
      await pool.query(
        `insert into neon_auth.account (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
         values (gen_random_uuid(), $1, 'credential', $2, $3, NOW(), NOW())`,
        [newAuthId, newAuthId, hashed]
      );
    } catch (fbErr) {
      console.error("[crearUsuario] fallback directo también falló:", fbErr);
      return { error: "No se pudo crear el usuario. Intenta de nuevo." };
    }
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

// Permite al admin personalizar la contraseña de cualquier usuario (o la suya propia)
// o generar una contraseña segura automáticamente.
export async function cambiarContrasenaUsuario(
  userId: string,
  nuevaContrasena?: string
): Promise<{ exito: boolean; password: string }> {
  const appUser = await requireAdmin();

  const result = await pool.query(
    `select email from users where tenant_id = $1 and id = $2 limit 1`,
    [appUser.tenant_id, userId]
  );
  const fila = result.rows[0];
  if (!fila) {
    throw new Error("Usuario no encontrado.");
  }

  const authUserResult = await pool.query(`select id from neon_auth."user" where email = $1 limit 1`, [fila.email]);
  const authUser = authUserResult.rows[0];
  if (!authUser) {
    throw new Error("No se encontró la cuenta de acceso para este correo.");
  }

  const passwordLimpia = (nuevaContrasena || "").trim();
  if (passwordLimpia && passwordLimpia.length < 8) {
    throw new Error("La contraseña debe tener al menos 8 caracteres.");
  }

  const passwordFinal = passwordLimpia || generarContrasenaSegura();

  // 1. Intento por Neon Auth SDK
  try {
    const { error: errorReset } = await auth.admin.setUserPassword({
      userId: authUser.id,
      newPassword: passwordFinal,
    });
    if (errorReset) {
      console.warn("[cambiarContrasenaUsuario] Neon Auth SDK reportó:", errorReset.message);
    }
  } catch (err) {
    console.warn("[cambiarContrasenaUsuario] Advertencia en auth.admin.setUserPassword:", err);
  }

  // 2. Actualización criptográfica directa con scrypt en neon_auth.account
  const hashed = await hashPasswordScrypt(passwordFinal);
  const updateRes = await pool.query(
    `update neon_auth.account set password = $1, "updatedAt" = NOW() where "userId" = $2 and "providerId" = 'credential'`,
    [hashed, authUser.id]
  );
  if (updateRes.rowCount === 0) {
    await pool.query(
      `insert into neon_auth.account (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
       values (gen_random_uuid(), $1, 'credential', $1, $2, NOW(), NOW())`,
      [authUser.id, hashed]
    );
  }

  // Si se le cambia la contraseña a otro usuario, invalidar sus sesiones existentes
  if (userId !== appUser.id) {
    await pool.query(`delete from neon_auth.session where "userId" = $1`, [authUser.id]);
  }

  revalidatePath("/admin/users");
  return { exito: true, password: passwordFinal };
}

// Mantener para compatibilidad
export async function resetearContrasenaUsuario(userId: string): Promise<string> {
  const res = await cambiarContrasenaUsuario(userId);
  return res.password;
}
