import { redirect } from "next/navigation";
import { getCurrentAppUser, type AppUser } from "@/lib/current-user";

// Server Components/Actions del panel admin llaman esto primero. Nunca confiar
// en el rol que venga del cliente — siempre se resuelve desde la sesión + la
// tabla `users` (ver /tagsense-docs/skills/multi-tenant-auth/SKILL.md).
export async function requireAdmin(): Promise<AppUser> {
  const appUser = await getCurrentAppUser();
  if (!appUser || appUser.role !== "admin") {
    redirect("/admin/login");
  }
  return appUser;
}
