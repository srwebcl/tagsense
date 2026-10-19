import { getCurrentAppUser } from "@/lib/current-user";
import { listarCategoriasFalla } from "@/lib/fault-categories";
import { withErrorLogging } from "@/lib/api-handler";

// La app de campo pinta los tiles de "Tengo una falla en..." a partir de este
// catálogo (antes venían fijos en el HTML — ver public/assets/js/asistente.js).
// Requiere sesión porque solo se llama después de abrir el Asistente Técnico,
// que ya exige login (igual que /api/assistant/chat).
export const GET = withErrorLogging("fault-categories", async () => {
  const appUser = await getCurrentAppUser();
  if (!appUser) {
    return Response.json({ error: { code: "unauthorized", message: "Sesión inválida." } }, { status: 401 });
  }

  const categorias = await listarCategoriasFalla(appUser.tenant_id);
  return Response.json({ categorias });
});
