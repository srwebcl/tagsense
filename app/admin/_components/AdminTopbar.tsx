"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ROLE_LABELS, type Rol } from "@/lib/roles";

const NAV_ITEMS = [
  {
    href: "/admin",
    label: "Activos",
    match: (path: string) => path === "/admin" || path.startsWith("/admin/assets"),
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="3" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="2" />
        <rect x="13" y="3" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="2" />
        <rect x="3" y="13" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="2" />
        <rect x="13" y="13" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="2" />
      </svg>
    ),
  },
  {
    href: "/admin/users",
    label: "Usuarios",
    match: (path: string) => path.startsWith("/admin/users"),
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <circle cx="9" cy="8" r="3.2" stroke="currentColor" strokeWidth="2" />
        <path d="M3.5 19c0-3 2.5-5.2 5.5-5.2s5.5 2.2 5.5 5.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M16 8.3a3.2 3.2 0 1 1 1.3 6.1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M15.3 13.9c2.3.4 4.2 2.3 4.2 5.1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
];

export function AdminTopbar({ userName, userRole }: { userName: string; userRole?: Rol }) {
  const pathname = usePathname();

  async function handleSignOut() {
    // Sin Content-Type ni body, el proxy de Neon Auth (@neondatabase/auth)
    // reenvía la petición con un body vacío como string — undici le pone
    // Content-Type: text/plain por default, y el servidor de Neon Auth lo
    // rechaza con 415 (nunca llega a borrar las cookies de sesión). Mandar
    // un body JSON explícito evita ese default.
    await fetch("/api/auth/sign-out", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    window.location.href = "/admin/login";
  }

  const inicial = userName.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="admin-topbar">
      <div className="admin-topbar-left">
        <a href="/admin" className="admin-brand">
          <img src="/assets/img/logo-mark.png" alt="TAGSENSE" />
          <span>
            TAG<b>SENSE</b> · Admin
          </span>
        </a>

        <nav className="admin-nav">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`admin-nav-link${item.match(pathname) ? " active" : ""}`}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="admin-topbar-actions">
        <div className="admin-user-info">
          <span className="admin-avatar">{inicial}</span>
          <div className="admin-user-text">
            <span className="admin-user-name">{userName}</span>
            {userRole ? <span className="admin-user-role">{ROLE_LABELS[userRole]}</span> : null}
          </div>
        </div>
        <button type="button" className="admin-signout" onClick={handleSignOut}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
