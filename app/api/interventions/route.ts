import { getCurrentAppUser } from "@/lib/current-user";
import { pool } from "@/lib/db";

// Crea una intervención (historial técnico) — ver API_SPEC.md y DATABASE_SCHEMA.md.
// tenant_id y technician_id siempre se resuelven desde la sesión, nunca desde el body.
export async function POST(request: Request) {
  const appUser = await getCurrentAppUser();
  if (!appUser) {
    return Response.json({ error: { code: "unauthorized", message: "Sesión inválida o usuario sin tenant asignado." } }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || !body.tag_code) {
    return Response.json({ error: { code: "bad_request", message: "Falta tag_code del activo." } }, { status: 400 });
  }

  const assetResult = await pool.query(
    `select id from assets where tenant_id = $1 and tag_code = $2 limit 1`,
    [appUser.tenant_id, body.tag_code]
  );
  const asset = assetResult.rows[0];
  if (!asset) {
    return Response.json({ error: { code: "not_found", message: "Activo no encontrado para este código." } }, { status: 404 });
  }

  const result = await pool.query(
    `insert into interventions
       (tenant_id, asset_id, technician_id, diagnosis, work_performed, parts_used,
        started_at, finished_at, operational_after, details, created_offline)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     returning id, started_at, finished_at`,
    [
      appUser.tenant_id,
      asset.id,
      appUser.id,
      body.diagnosis ?? null,
      body.work_performed ?? null,
      JSON.stringify(body.parts_used ?? {}),
      body.started_at ?? new Date().toISOString(),
      body.finished_at ?? null,
      body.operational_after ?? null,
      JSON.stringify(body.details ?? {}),
      body.created_offline ?? false,
    ]
  );

  return Response.json(result.rows[0], { status: 201 });
}
