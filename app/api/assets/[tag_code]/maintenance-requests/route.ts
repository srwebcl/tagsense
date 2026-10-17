import { getCurrentAppUser } from "@/lib/current-user";
import { pool } from "@/lib/db";

// Solicitudes de mantenimiento de un activo — generadas desde el informe de
// campo ("¿Aplica una solicitud de mantenimiento?"), ver /api/interventions.
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
       mr.id, mr.folio, mr.tipo, mr.prioridad, mr.componente, mr.descripcion,
       mr.estado, mr.created_at, mr.resolved_at,
       u.full_name as tecnico_nombre
     from maintenance_requests mr
     join assets a on a.id = mr.asset_id
     left join users u on u.id = mr.created_by
     where mr.tenant_id = $1 and a.tag_code = $2
     order by mr.created_at desc`,
    [appUser.tenant_id, tag_code]
  );

  return Response.json(result.rows);
}
