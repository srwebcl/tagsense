"use client";

export function AdminTopbar({ userName }: { userName: string }) {
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

  return (
    <div className="admin-topbar">
      <a href="/admin" className="admin-brand">
        <img src="/assets/img/logo-mark.png" alt="TAGSENSE" />
        <span>
          TAG<b>SENSE</b> · Admin
        </span>
      </a>
      <div className="admin-topbar-actions">
        <a href="/admin/users" className="admin-user-chip" style={{ textDecoration: "none" }}>
          Usuarios
        </a>
        <span className="admin-user-chip">{userName}</span>
        <button type="button" className="admin-signout" onClick={handleSignOut}>
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
