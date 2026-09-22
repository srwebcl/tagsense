import { getCurrentAppUser } from "@/lib/current-user";
import { pool } from "@/lib/db";

// Historial técnico de un activo — ver API_SPEC.md: GET /api/assets/:id/interventions.
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
    `select
       i.id, i.diagnosis, i.work_performed, i.parts_used, i.started_at, i.finished_at,
       i.operational_after, i.details,
       u.full_name as technician_name,
       r.id as report_id, r.folio as report_folio, r.file_url as report_file_key, r.generated_at as report_generated_at
     from interventions i
     join assets a on a.id = i.asset_id
     join users u on u.id = i.technician_id
     left join reports r on r.intervention_id = i.id
     where i.tenant_id = $1 and a.tag_code = $2
     order by i.started_at desc`,
    [appUser.tenant_id, tag_code]
  );

  return Response.json(result.rows);
}
