import { getCurrentAppUser } from "@/lib/current-user";
import { pool } from "@/lib/db";
import { withErrorLogging } from "@/lib/api-handler";

// Ficha de vida de componentes críticos — ver API_SPEC.md: GET /api/assets/:id/components.
// No hay una tabla `components` aparte: cada informe que interviene un componente
// ya queda guardado en interventions.details->>'componente' (ver guardarInformeEnBackend
// en app.js), así que esto es solo una lectura, no un camino de escritura nuevo —
// hereda gratis la durabilidad de la cola offline del informe (ver auditoría
// pre-lanzamiento, hallazgo "Componentes Críticos sin persistencia").
export const GET = withErrorLogging("assets/:tag_code/components", async (
  request: Request,
  { params }: { params: Promise<{ tag_code: string }> }
) => {
  const appUser = await getCurrentAppUser();
  if (!appUser) {
    return Response.json({ error: { code: "unauthorized", message: "Sesión inválida o usuario sin tenant asignado." } }, { status: 401 });
  }

  const { tag_code } = await params;

  const result = await pool.query(
    `select
       i.details ->> 'componente' as componente,
       i.started_at,
       i.details ->> 'horometro' as horometro,
       i.details ->> 'empresa' as empresa,
       coalesce(i.work_performed, i.diagnosis) as detalle,
       r.folio,
       u.full_name as tecnico
     from interventions i
     join assets a on a.id = i.asset_id
     join users u on u.id = i.technician_id
     left join reports r on r.intervention_id = i.id
     where i.tenant_id = $1 and a.tag_code = $2
       and i.details ->> 'componente' is not null
       and i.details ->> 'componente' <> 'ninguno'
     order by i.started_at desc`,
    [appUser.tenant_id, tag_code]
  );

  return Response.json(result.rows);
});
