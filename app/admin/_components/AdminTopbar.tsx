"use client";

export function AdminTopbar({ userName }: { userName: string }) {
  async function handleSignOut() {
    await fetch("/api/auth/sign-out", { method: "POST" });
    window.location.href = "/admin/login";
  }

  return (
    <div className="admin-topbar">
      <a href="/admin" className="admin-brand">
        <img src="/assets/img/logo-mark.png" alt="TAGSENSE" />
        <span>
          TAG<b>SENSE</b> · Admin
        </span>
      </a>
      <div className="admin-topbar-actions">
        <span className="admin-user-chip">{userName}</span>
        <button type="button" className="admin-signout" onClick={handleSignOut}>
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
