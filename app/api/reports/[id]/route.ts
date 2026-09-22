import { getCurrentAppUser } from "@/lib/current-user";
import { pool } from "@/lib/db";
import { uploads } from "@/lib/storage";

// GET /api/reports/:id — ver API_SPEC.md: estado + URL de descarga.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const appUser = await getCurrentAppUser();
  if (!appUser) {
    return Response.json({ error: { code: "unauthorized", message: "Sesión inválida o usuario sin tenant asignado." } }, { status: 401 });
  }

  const { id } = await params;

  const result = await pool.query(
    `select id, folio, file_url, generated_at from reports where tenant_id = $1 and id = $2 limit 1`,
    [appUser.tenant_id, id]
  );
  const report = result.rows[0];
  if (!report) {
    return Response.json({ error: { code: "not_found", message: "Informe no encontrado." } }, { status: 404 });
  }

  const url = await uploads.url(report.file_url, { expiresIn: 3600 });

  return Response.json({ id: report.id, folio: report.folio, generated_at: report.generated_at, url });
}
