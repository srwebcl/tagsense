import { getCurrentAppUser } from "@/lib/current-user";
import { pool } from "@/lib/db";

// Resuelve un activo por el código leído del tag (QR o NFC) — ver API_SPEC.md.
// tenant_id nunca se recibe del cliente: se resuelve siempre desde la sesión
// autenticada (ver /tagsense-docs/skills/multi-tenant-auth/SKILL.md, regla #3).
export async function GET(
  request: Request,
  { params }: { params: Promise<{ tag_code: string }> }
) {
  const appUser = await getCurrentAppUser();
  if (!appUser) {
    return Response.json({ error: { code: "unauthorized", message: "Sesión inválida o usuario sin tenant asignado." } }, { status: 401 });
  }

  const { tag_code } = await params;

  const result = await pool.query(
    `select id, tag_code, name, model, serial_number, status, location, hour_meter, last_intervention_at
     from assets
     where tenant_id = $1 and tag_code = $2
     limit 1`,
    [appUser.tenant_id, tag_code]
  );

  const asset = result.rows[0];
  if (!asset) {
    return Response.json({ error: { code: "not_found", message: "Activo no encontrado para este código." } }, { status: 404 });
  }

  return Response.json(asset);
}
