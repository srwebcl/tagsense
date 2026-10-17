import { getCurrentAppUser } from "@/lib/current-user";
import { pool } from "@/lib/db";

// Marca una solicitud de mantenimiento como resuelta. Por ahora el único cambio
// de estado soportado es "Resuelta" — no se vuelve a abrir desde aquí.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const appUser = await getCurrentAppUser();
  if (!appUser) {
    return Response.json({ error: { code: "unauthorized", message: "Sesión inválida o usuario sin tenant asignado." } }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body || body.estado !== "Resuelta") {
    return Response.json({ error: { code: "bad_request", message: "Solo se admite estado: 'Resuelta'." } }, { status: 400 });
  }

  const result = await pool.query(
    `update maintenance_requests
     set estado = 'Resuelta', resolved_by = $1, resolved_at = now()
     where tenant_id = $2 and id = $3 and estado = 'Abierta'
     returning id, estado, resolved_at`,
    [appUser.id, appUser.tenant_id, id]
  );

  if (!result.rows[0]) {
    return Response.json({ error: { code: "not_found", message: "Solicitud no encontrada o ya estaba resuelta." } }, { status: 404 });
  }

  return Response.json(result.rows[0]);
}
