"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ROLE_LABELS, type Rol } from "@/lib/roles";

const NAV_ITEMS = [
  {
    href: "/admin",
    label: "Activos",
    badge: null,
    match: (path: string) => path === "/admin" || (path.startsWith("/admin/assets") && !path.startsWith("/admin/categorias")),
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="3" width="7" height="7" rx="1.8" stroke="currentColor" strokeWidth="1.8" />
        <rect x="14" y="3" width="7" height="7" rx="1.8" stroke="currentColor" strokeWidth="1.8" />
        <rect x="3" y="14" width="7" height="7" rx="1.8" stroke="currentColor" strokeWidth="1.8" />
        <rect x="14" y="14" width="7" height="7" rx="1.8" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    ),
  },
  {
    href: "/admin/categorias",
    label: "Categorías",
    badge: null,
    match: (path: string) => path.startsWith("/admin/categorias"),
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M12 3 3 8l9 5 9-5-9-5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M3 16l9 5 9-5M3 12l9 5 9-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/admin/users",
    label: "Usuarios",
    badge: null,
    match: (path: string) => path.startsWith("/admin/users"),
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <circle cx="9" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M3.5 19c0-3 2.5-5.2 5.5-5.2s5.5 2.2 5.5 5.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M16 8.3a3.2 3.2 0 1 1 1.3 6.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M15.3 13.9c2.3.4 4.2 2.3 4.2 5.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
];

export function AdminShell({
  userName,
  userRole,
  children,
}: {
  userName: string;
  userRole?: Rol;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  async function handleSignOut() {
    await fetch("/api/auth/sign-out", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    window.location.href = "/admin/login";
  }

  const inicial = userName.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="admin-shell">
      {/* Mobile Top Header (solo visible en pantallas pequeñas) */}
      <header className="admin-mobile-header">
        <button
          type="button"
          className="admin-mobile-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Abrir menú"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
        <Link href="/admin" className="admin-brand">
          <img src="/assets/img/logo-mark.png" alt="TAGSENSE" className="admin-brand-favicon" />
          <span className="brand-title">
            TAG<b>SENSE</b>
          </span>
        </Link>
        <span className="admin-avatar admin-avatar-sm">{inicial}</span>
      </header>

      {/* Overlay para cerrar en móvil */}
      {mobileMenuOpen && (
        <div
          className="admin-sidebar-backdrop"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Menú Lateral (Sidebar) */}
      <aside className={`admin-sidebar ${mobileMenuOpen ? "open" : ""}`}>
        {/* Brand Header */}
        <div className="admin-sidebar-header">
          <Link href="/admin" className="admin-brand" onClick={() => setMobileMenuOpen(false)}>
            <img src="/assets/img/logo-mark.png" alt="TAGSENSE" className="admin-brand-favicon" />
            <span className="brand-title">
              TAG<b>SENSE</b>
            </span>
          </Link>
          <div className="admin-portal-badge">
            <span className="admin-portal-dot" />
            <span>Portal Administrador</span>
          </div>
        </div>

        {/* Navigation Modules */}
        <div className="admin-sidebar-nav-wrap">
          <div className="admin-sidebar-section-title">MÓDULOS PRINCIPALES</div>
          <nav className="admin-sidebar-nav">
            {NAV_ITEMS.map((item) => {
              const active = item.match(pathname);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={false}
                  className={`admin-sidebar-link ${active ? "active" : ""}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="admin-sidebar-icon">{item.icon}</span>
                  <span className="admin-sidebar-text">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="admin-sidebar-section-title" style={{ marginTop: 24 }}>
            ACCESOS DIRECTOS
          </div>
          <nav className="admin-sidebar-nav">
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="admin-sidebar-link"
              title="Abrir la app móvil para operadores en terreno"
            >
              <span className="admin-sidebar-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <rect x="6" y="2" width="12" height="20" rx="3" stroke="currentColor" strokeWidth="1.8" />
                  <line x1="11" y1="18" x2="13" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </span>
              <span className="admin-sidebar-text">App de Terreno</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ marginLeft: "auto", opacity: 0.5 }}>
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          </nav>
        </div>

        {/* Footer: User profile & Logout */}
        <div className="admin-sidebar-footer">
          <div className="admin-sidebar-user-card">
            <span className="admin-avatar">{inicial}</span>
            <div className="admin-sidebar-user-info">
              <span className="admin-sidebar-user-name" title={userName}>
                {userName}
              </span>
              {userRole && (
                <span className="admin-sidebar-user-role">
                  {ROLE_LABELS[userRole] || userRole}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            className="admin-sidebar-logout-btn"
            onClick={handleSignOut}
            title="Cerrar sesión de administrador"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="admin-main">
        {children}
      </main>
    </div>
  );
}

// Para compatibilidad con páginas que aún importaban AdminTopbar
export function AdminTopbar({ userName, userRole }: { userName: string; userRole?: Rol }) {
  // Cuando se use como componente aislado, actúa como navbar superior simple o no-op
  return null;
}
