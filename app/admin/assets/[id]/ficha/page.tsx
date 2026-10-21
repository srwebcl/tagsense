import Link from "next/link";
import { requireAdmin } from "@/lib/require-admin";
import { pool } from "@/lib/db";
import { listarCategoriasFalla, listarComponentesDeActivo, listarTiposFicha } from "@/lib/fault-categories";
import { uploads } from "@/lib/storage";
import { guardarFichaDeSistema, agregarComponenteActivo, quitarComponenteActivo, subirFotoActivo } from "@/app/admin/assets/actions";
import { AdminShell } from "@/app/admin/_components/AdminShell";
import { FichaEditor } from "./FichaEditor";

export default async function FichaTecnicaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sistema?: string }>;
}) {
  const appUser = await requireAdmin();
  const { id } = await params;
  const { sistema: sistemaInicial } = await searchParams;

  const assetResult = await pool.query(
    `select id, tag_code, name, photo_url from assets where tenant_id = $1 and id = $2 limit 1`,
    [appUser.tenant_id, id]
  );
  const asset = assetResult.rows[0];

  if (!asset) {
    return (
      <AdminShell userName={appUser.full_name || appUser.email} userRole={appUser.role}>
        <div className="admin-container">
          <div className="admin-empty">Activo no encontrado.</div>
        </div>
      </AdminShell>
    );
  }

  const [catalogoCompleto, componentes, tipos, fichaResult] = await Promise.all([
    listarCategoriasFalla(appUser.tenant_id),
    listarComponentesDeActivo(appUser.tenant_id, id),
    listarTiposFicha(appUser.tenant_id),
    pool.query(
      `select category_slug, field_type_slug, raw_text from asset_documents
       where tenant_id = $1 and asset_id = $2 and source_type = 'simulated'
         and category_slug is not null and field_type_slug is not null`,
      [appUser.tenant_id, id]
    ),
  ]);

  const existente: Record<string, Record<string, string>> = {};
  for (const fila of fichaResult.rows) {
    existente[fila.category_slug] ||= {};
    existente[fila.category_slug][fila.field_type_slug] = fila.raw_text || "";
  }

  const slugsActivos = new Set(componentes.map((c) => c.slug));
  const catalogoDisponible = catalogoCompleto.filter((c) => !slugsActivos.has(c.slug));

  const acciones: Record<string, (formData: FormData) => Promise<void>> = {};
  for (const c of componentes) {
    acciones[c.slug] = guardarFichaDeSistema.bind(null, id, c.slug);
  }

  const agregarComponente = agregarComponenteActivo.bind(null, id);
  const quitarComponente = quitarComponenteActivo.bind(null, id);
  const photoUrl = asset.photo_url ? await uploads.url(asset.photo_url, { expiresIn: 3600 }) : null;
  const subirFotoAction = subirFotoActivo.bind(null, id);

  return (
    <AdminShell userName={appUser.full_name || appUser.email} userRole={appUser.role}>
      <div className="admin-container admin-container-wide">
        <Link href={`/admin/assets/${id}`} className="link-back">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {asset.name}
        </Link>

        <div className="admin-page-head">
          <div>
            <h1>Ficha técnica</h1>
            <p className="sub">
              {asset.name} · {asset.tag_code}. Fotografía del equipo y especificaciones por sistema que utiliza el
              Asistente en terreno.
            </p>
          </div>
          <Link href="/admin/categorias" className="btn-outline">
            Catálogo de categorías
          </Link>
        </div>

        <FichaEditor
          assetId={id}
          photoUrl={photoUrl}
          subirFotoAction={subirFotoAction}
          componentes={componentes}
          catalogoDisponible={catalogoDisponible}
          tipos={tipos}
          existente={existente}
          acciones={acciones}
          agregarComponente={agregarComponente}
          quitarComponente={quitarComponente}
          sistemaInicial={sistemaInicial}
        />
      </div>
    </AdminShell>
  );
}
