import Link from "next/link";
import { requireAdmin } from "@/lib/require-admin";
import { pool } from "@/lib/db";
import { AdminTopbar } from "@/app/admin/_components/AdminTopbar";
import { RoleSelect } from "@/app/admin/_components/RoleSelect";
import { RevokeAccessButton } from "@/app/admin/_components/RevokeAccessButton";
import { ResetPasswordButton } from "@/app/admin/_components/ResetPasswordButton";
import { cambiarRolUsuario, quitarAccesoUsuario, resetearContrasenaUsuario } from "./actions";

const ROLE_LABELS: Record<string, string> = { admin: "Admin", technician: "Técnico", maintainer: "Mantenedor" };

export default async function UsersPage() {
  const appUser = await requireAdmin();

  const result = await pool.query(
    `select id, email, full_name, role, created_at from users where tenant_id = $1 order by created_at asc`,
    [appUser.tenant_id]
  );

  return (
    <>
      <AdminTopbar userName={appUser.full_name || appUser.email} />
      <div className="admin-container" style={{ maxWidth: 720 }}>
        <Link href="/admin" className="link-back">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Activos
        </Link>

        <div className="admin-page-head">
          <div>
            <h1>Usuarios</h1>
            <p className="sub">
              Quién puede entrar a TAGSENSE y con qué rol. Un <b>Técnico</b> puede usar la app de campo (activos,
              informes, asistente) pero no entra a este panel de administración.
            </p>
          </div>
          <Link href="/admin/users/new" className="btn">
            + Nuevo usuario
          </Link>
        </div>

        <div className="doc-list">
          {result.rows.map((u) => {
            const quitarAccesoDeEsteUsuario = quitarAccesoUsuario.bind(null, u.id);
            const esUnoMismo = u.id === appUser.id;
            return (
              <div key={u.id} className="doc-row" style={{ alignItems: "flex-start" }}>
                <div className="txt">
                  <strong>{u.full_name || u.email}</strong>
                  <small>{u.email}</small>
                </div>
                {esUnoMismo ? (
                  <span className="badge">{ROLE_LABELS[u.role] || u.role} (vos)</span>
                ) : (
                  <RoleSelect userId={u.id} rolActual={u.role} action={cambiarRolUsuario} />
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
                  <ResetPasswordButton userId={u.id} userName={u.full_name || u.email} action={resetearContrasenaUsuario} />
                  {!esUnoMismo && <RevokeAccessButton userName={u.full_name || u.email} action={quitarAccesoDeEsteUsuario} />}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
