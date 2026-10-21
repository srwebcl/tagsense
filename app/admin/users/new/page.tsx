import Link from "next/link";
import { requireAdmin } from "@/lib/require-admin";
import { AdminShell } from "@/app/admin/_components/AdminShell";
import { NewUserForm } from "./NewUserForm";

export default async function NewUserPage() {
  const appUser = await requireAdmin();

  return (
    <AdminShell userName={appUser.full_name || appUser.email} userRole={appUser.role}>
      <div className="admin-container" style={{ maxWidth: 600 }}>
        <Link href="/admin/users" className="link-back">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Usuarios
        </Link>

        <div className="admin-page-head">
          <div>
            <h1>Nuevo usuario</h1>
            <p className="sub">Crea el acceso y asigna su rol dentro de TAGSENSE.</p>
          </div>
        </div>

        <NewUserForm />
      </div>
    </AdminShell>
  );
}
