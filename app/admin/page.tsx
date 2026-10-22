import Link from "next/link";
import { requireAdmin } from "@/lib/require-admin";
import { pool } from "@/lib/db";
import { AdminShell } from "@/app/admin/_components/AdminShell";
import { ActivosTable, type AssetListItem } from "@/app/admin/_components/ActivosTable";

export default async function AdminHomePage() {
  const appUser = await requireAdmin();

  const result = await pool.query(
    `select id, tag_code, name, model, manufacturer, status, location, asset_type, photo_url, hour_meter
     from assets
     where tenant_id = $1
     order by created_at desc`,
    [appUser.tenant_id]
  );

  // Asignar URLs de fotos usando endpoint con caché permanente HTTP
  const assets: AssetListItem[] = result.rows.map((row) => ({
    id: row.id,
    tag_code: row.tag_code,
    name: row.name,
    model: row.model,
    manufacturer: row.manufacturer,
    status: row.status,
    location: row.location,
    asset_type: row.asset_type,
    photo_url: row.photo_url
      ? `/api/assets/${row.id}/photo?v=${encodeURIComponent(row.photo_url)}`
      : null,
    hour_meter: row.hour_meter,
  }));

  return (
    <AdminShell userName={appUser.full_name || appUser.email} userRole={appUser.role}>
      <div className="admin-container admin-container-wide">
        <div className="admin-page-head">
          <div>
            <h1>Activos y Flota</h1>
            <p className="sub">
              {assets.length} activo{assets.length === 1 ? "" : "s"} registrado{assets.length === 1 ? "" : "s"}. Gestión de equipos, tags de identificación y especificaciones para terreno.
            </p>
          </div>
          <Link href="/admin/assets/new" className="btn-outline">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
            Nuevo activo
          </Link>
        </div>

        <ActivosTable assets={assets} />
      </div>
    </AdminShell>
  );
}
