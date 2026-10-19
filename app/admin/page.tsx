import Link from "next/link";
import { requireAdmin } from "@/lib/require-admin";
import { pool } from "@/lib/db";
import { AdminTopbar } from "@/app/admin/_components/AdminTopbar";

const STATUS_LABEL: Record<string, string> = {
  operativo: "Operativo",
  mantenimiento: "Mantención",
  fuera_de_servicio: "Fuera de servicio",
};
const STATUS_CLASS: Record<string, string> = {
  operativo: "ok",
  mantenimiento: "warn",
  fuera_de_servicio: "err",
};

export default async function AdminHomePage() {
  const appUser = await requireAdmin();

  const result = await pool.query(
    `select id, tag_code, name, model, status, location, asset_type
     from assets
     where tenant_id = $1
     order by name`,
    [appUser.tenant_id]
  );

  return (
    <>
      <AdminTopbar userName={appUser.full_name || appUser.email} userRole={appUser.role} />
      <div className="admin-container">
        <div className="admin-page-head">
          <div>
            <h1>Activos</h1>
            <p className="sub">{result.rows.length} activo{result.rows.length === 1 ? "" : "s"} cargado{result.rows.length === 1 ? "" : "s"}</p>
          </div>
          <Link href="/admin/assets/new" className="btn-outline">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
            Nuevo activo
          </Link>
        </div>

        {result.rows.length === 0 ? (
          <div className="admin-empty">Todavía no hay activos cargados. Crea el primero para empezar.</div>
        ) : (
          <div className="asset-grid">
            {result.rows.map((asset) => (
              <Link key={asset.id} href={`/admin/assets/${asset.id}`} className="asset-grid-card">
                <p className="name">{asset.name}</p>
                <p className="tag">{asset.tag_code}{asset.asset_type ? ` · ${asset.asset_type}` : ""}</p>
                <span className={`status-pill ${STATUS_CLASS[asset.status] || "warn"}`}>
                  <span className="dot" />
                  {STATUS_LABEL[asset.status] || asset.status}
                </span>
                <p className="meta" style={{ marginTop: 10 }}>
                  {asset.model || "Sin modelo"} · {asset.location || "Sin ubicación"}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
