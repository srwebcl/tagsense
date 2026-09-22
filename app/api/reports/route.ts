import { randomUUID } from "node:crypto";
import { getCurrentAppUser } from "@/lib/current-user";
import { pool } from "@/lib/db";
import { uploads } from "@/lib/storage";

// Sube el PDF ya generado en el navegador (jsPDF, ver skill pdf-reports — se queda
// client-side en Etapa 1) y deja el registro en `reports`, asociado a la intervención.
// multipart/form-data: file (el PDF), intervention_id, folio.
export async function POST(request: Request) {
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
    `select id from interventions where tenant_id = $1 and id = $2 limit 1`,
    [appUser.tenant_id, interventionId]
  );
  if (!interventionResult.rows[0]) {
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

  return Response.json({ ...result.rows[0], url }, { status: 201 });
}
