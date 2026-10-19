export const ROLES = ["admin", "technician"] as const;
export type Rol = (typeof ROLES)[number];

export function esRolValido(valor: string): valor is Rol {
  return (ROLES as readonly string[]).includes(valor);
}

export const ROLE_LABELS: Record<Rol, string> = {
  admin: "Admin",
  technician: "Técnico",
};

export const ROLE_DESCRIPTIONS: Record<Rol, string> = {
  admin: "Acceso completo al panel de administración: crea y edita activos, gestiona usuarios y sus roles.",
  technician: "Solo usa la app de campo: ver activos, generar informes y usar el asistente IA. No entra a este panel de administración.",
};
