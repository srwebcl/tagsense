import { randomUUID } from "node:crypto";
import { getCurrentAppUser } from "@/lib/current-user";
import { pool } from "@/lib/db";
import { uploads } from "@/lib/storage";
import { withErrorLogging } from "@/lib/api-handler";
import { enviarNotificacionInforme } from "@/lib/email";

// Sube el PDF ya generado en el navegador (jsPDF, ver skill pdf-reports — se queda
// client-side en Etapa 1) y deja el registro en `reports`, asociado a la intervención.
// multipart/form-data: file (el PDF), intervention_id, folio.
export const POST = withErrorLogging("reports", async (request: Request) => {
  const appUser = await getCurrentAppUser();
  if (!appUser) {
    return Response.json({ error: { code: "unauthorized", message: "Sesión inválida o usuario sin tenant asignado." } }, { status: 401 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const interventionId = form?.get("intervention_id");
  const folio = form?.get("folio");

  if (!form || !(file instanceof File) || typeof interventionId !== "string") {
    return Response.json({ error: { code: "bad_request", message: "Falta el archivo PDF o intervention_id." } }, { status: 400 });
  }

  const interventionResult = await pool.query(
    `select i.id, i.diagnosis, i.work_performed, i.started_at, i.finished_at, i.operational_after,
            a.name as asset_name, a.tag_code as asset_tag_code, a.model as asset_model,
            u.email as technician_email, u.full_name as technician_name
     from interventions i
     join assets a on a.id = i.asset_id
     left join users u on u.id = i.technician_id
     where i.tenant_id = $1 and i.id = $2
     limit 1`,
    [appUser.tenant_id, interventionId]
  );
  const intervention = interventionResult.rows[0];
  if (!intervention) {
    return Response.json({ error: { code: "not_found", message: "Intervención no encontrada." } }, { status: 404 });
  }

  const key = `reports/${appUser.tenant_id}/${interventionId}/${randomUUID()}.pdf`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  await uploads.upload(key, bytes, { contentType: "application/pdf" });

  const result = await pool.query(
    `insert into reports (tenant_id, intervention_id, file_url, folio, generated_at)
     values ($1, $2, $3, $4, now())
     returning id, folio, generated_at`,
    [appUser.tenant_id, interventionId, key, typeof folio === "string" ? folio : null]
  );

  const url = await uploads.url(key, { expiresIn: 3600 });

  // Consultar administradores del tenant para la notificación
  const adminUsersResult = await pool.query<{ email: string; full_name: string | null }>(
    `select email, full_name from users where tenant_id = $1 and role = 'admin'`,
    [appUser.tenant_id]
  );
  const adminEmails = adminUsersResult.rows.map((u) => u.email).filter(Boolean);

  // Enviar notificación por correo mediante Resend (al técnico y al admin)
  enviarNotificacionInforme({
    folio: typeof folio === "string" ? folio : null,
    pdfBytes: bytes,
    technician: {
      email: intervention.technician_email || appUser.email,
      fullName: intervention.technician_name || appUser.full_name,
    },
    asset: {
      name: intervention.asset_name,
      tagCode: intervention.asset_tag_code,
      model: intervention.asset_model,
    },
    intervention: {
      diagnosis: intervention.diagnosis,
      workPerformed: intervention.work_performed,
      operationalAfter: intervention.operational_after,
      startedAt: intervention.started_at,
      finishedAt: intervention.finished_at,
    },
    adminEmails,
    downloadUrl: url,
  }).catch((err) => {
    console.error("[reports] Error enviando correo con Resend:", err);
  });

  return Response.json({ ...result.rows[0], url }, { status: 201 });
});
