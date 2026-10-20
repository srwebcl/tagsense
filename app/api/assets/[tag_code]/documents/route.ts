import { getCurrentAppUser } from "@/lib/current-user";
import { pool } from "@/lib/db";
import { uploads } from "@/lib/storage";
import { withErrorLogging } from "@/lib/api-handler";

// Documentos reales subidos por el admin para este activo — ver API_SPEC.md:
// GET /api/assets/:id/documents. Reemplaza la pantalla "Lector de Documentos"
// que antes mostraba contenido fijo del MT65S para cualquier activo.
export const GET = withErrorLogging("assets/:tag_code/documents", async (
  request: Request,
  { params }: { params: Promise<{ tag_code: string }> }
) => {
  const appUser = await getCurrentAppUser();
  if (!appUser) {
    return Response.json({ error: { code: "unauthorized", message: "Sesión inválida o usuario sin tenant asignado." } }, { status: 401 });
  }

  const { tag_code } = await params;

  const result = await pool.query(
    `select ad.id, ad.title, ad.document_type, ad.file_url, ad.index_status, ad.created_at,
            ad.category_slug, ad.field_type_slug, ad.source_type, ad.raw_text
     from asset_documents ad
     join assets a on a.id = ad.asset_id
     where ad.tenant_id = $1 and a.tag_code = $2
     order by ad.created_at desc`,
    [appUser.tenant_id, tag_code]
  );

  const docs = await Promise.all(
    result.rows.map(async (d) => ({
      id: d.id,
      title: d.title,
      document_type: d.document_type,
      index_status: d.index_status,
      created_at: d.created_at,
      category_slug: d.category_slug,
      field_type_slug: d.field_type_slug,
      source_type: d.source_type,
      raw_text: d.raw_text,
      url: d.file_url ? await uploads.url(d.file_url, { expiresIn: 3600 }) : null,
    }))
  );

  return Response.json(docs);
});
