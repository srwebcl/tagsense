export const ROLES = ["admin", "technician", "maintainer"] as const;
export type Rol = (typeof ROLES)[number];

export function esRolValido(valor: string): valor is Rol {
  return (ROLES as readonly string[]).includes(valor);
}

export const ROLE_LABELS: Record<Rol, string> = {
  admin: "Admin",
  technician: "Técnico",
  maintainer: "Mantenedor",
};

// Mantenedor y Técnico tienen HOY el mismo acceso en el código (ambos solo
// usan la app de campo, ningún chequeo de rol los distingue) — la diferencia
// es de clasificación dentro del informe generado (sección "Alcances técnicos
// y recomendaciones del mantenedor"), no de permisos. Se deja así explícito
// en la descripción para no sugerir una separación de funciones que todavía
// no existe en el sistema.
export const ROLE_DESCRIPTIONS: Record<Rol, string> = {
  admin: "Acceso completo al panel de administración: crea y edita activos, gestiona usuarios y sus roles.",
  technician: "Solo usa la app de campo: ver activos, generar informes y usar el asistente IA. No entra a este panel de administración.",
  maintainer: "Mismo acceso que el Técnico en la app de campo. Hoy la diferencia es solo de clasificación dentro del informe (la sección de alcances técnicos del mantenedor), no de permisos.",
};
