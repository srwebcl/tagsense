import { getCurrentAppUser } from "@/lib/current-user";
import { listarComponentesDeActivo } from "@/lib/fault-categories";
import { withErrorLogging } from "@/lib/api-handler";

// La app de campo pinta los tiles de "Tengo una falla en..." a partir de los
// componentes activos de ESTE activo puntual (no todos los del tenant — un
// camión tiene tolva, una bomba no; ver asset_components y
// app/admin/assets/[id]/ficha). Requiere sesión porque solo se llama después
// de abrir el Asistente Técnico, que ya exige login (igual que
// /api/assistant/chat).
export const GET = withErrorLogging("fault-categories", async (request: Request) => {
  const appUser = await getCurrentAppUser();
  if (!appUser) {
    return Response.json({ error: { code: "unauthorized", message: "Sesión inválida." } }, { status: 401 });
  }

  const assetId = new URL(request.url).searchParams.get("asset_id");
  if (!assetId) {
    return Response.json({ error: { code: "bad_request", message: "Falta asset_id." } }, { status: 400 });
  }

  const categorias = await listarComponentesDeActivo(appUser.tenant_id, assetId);
  return Response.json({ categorias });
});
