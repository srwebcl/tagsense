"use client";

import { useState, useEffect } from "react";

function generarAleatoriaLocal(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 16; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

export function ChangePasswordButton({
  userId,
  userName,
  userEmail,
  isSelf = false,
  action,
}: {
  userId: string;
  userName: string;
  userEmail?: string;
  isSelf?: boolean;
  action: (userId: string, nuevaContrasena?: string) => Promise<{ exito: boolean; password: string }>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{ password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Cerrar con Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen && !loading) {
        handleClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, loading]);

  function handleOpen() {
    setPassword("");
    setShowPassword(true);
    setError(null);
    setSuccessData(null);
    setCopied(false);
    setIsOpen(true);
  }

  function handleClose() {
    if (loading) return;
    setIsOpen(false);
    setPassword("");
    setError(null);
    setSuccessData(null);
    setCopied(false);
  }

  function handleGenerar() {
    const nueva = generarAleatoriaLocal();
    setPassword(nueva);
    setShowPassword(true);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleanPw = password.trim();
    if (cleanPw.length > 0 && cleanPw.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await action(userId, cleanPw || undefined);
      setSuccessData({ password: res.password });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar la contraseña.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!successData?.password) return;
    try {
      await navigator.clipboard.writeText(successData.password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Fallback si clipboard falla
      const input = document.createElement("input");
      input.value = successData.password;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  }

  return (
    <>
      <button
        type="button"
        className="btn-outline"
        onClick={handleOpen}
        title={`Cambiar contraseña de ${userName}`}
        style={{ fontSize: 11.5, padding: "0 12px", height: 34 }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
          <circle cx="8" cy="15" r="4" stroke="currentColor" strokeWidth="2" />
          <path d="M10.85 12.15L19 4M18 5l2 2M15 8l2 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Cambiar contraseña
      </button>

      {isOpen && (
        <div className="admin-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
          <div className="admin-modal-card" role="dialog" aria-modal="true">
            <div className="admin-modal-head">
              <div>
                <h2>Cambiar contraseña</h2>
                <p>
                  {isSelf ? "Actualiza tu propia contraseña de acceso." : `Define la contraseña para ${userName}`}
                  {userEmail ? <span style={{ display: "block", color: "var(--copper-1)", fontWeight: 600 }}>{userEmail}</span> : null}
                </p>
              </div>
              <button
                type="button"
                className="admin-modal-close"
                onClick={handleClose}
                aria-label="Cerrar ventana"
                disabled={loading}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {successData ? (
              <div className="admin-modal-body">
                <div className="pw-success-box">
                  <div className="title">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    ¡Contraseña actualizada exitosamente!
                  </div>
                  <p className="sub" style={{ margin: "0 0 10px", fontSize: 12 }}>
                    {isSelf
                      ? "Tu contraseña ha sido cambiada. Cópiala o guárdala en un lugar seguro:"
                      : `Comparte esta contraseña con ${userName} por un canal seguro:`}
                  </p>
                  <div className="pw-display-code">
                    <span>{successData.password}</span>
                    <button
                      type="button"
                      className={`pw-copy-btn${copied ? " copied" : ""}`}
                      onClick={handleCopy}
                    >
                      {copied ? (
                        <>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                            <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          </svg>
                          ¡Copiada!
                        </>
                      ) : (
                        <>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                            <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2" />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="2" />
                          </svg>
                          Copiar
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="admin-modal-actions">
                  <button type="button" className="btn-outline" onClick={handleClose}>
                    Cerrar
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="admin-modal-body">
                  <div className="field" style={{ marginBottom: 12 }}>
                    <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>Nueva contraseña <span className="req">*</span></span>
                    </label>

                    <div className="pw-input-box">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Escribe la contraseña o presiona generar"
                        autoFocus
                        disabled={loading}
                      />
                      <button
                        type="button"
                        className="pw-tool-btn"
                        onClick={() => setShowPassword(!showPassword)}
                        title={showPassword ? "Ocultar" : "Mostrar"}
                        tabIndex={-1}
                      >
                        {showPassword ? (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          </svg>
                        ) : (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2" />
                            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
                          </svg>
                        )}
                      </button>
                      <button
                        type="button"
                        className="pw-generate-badge-btn"
                        onClick={handleGenerar}
                        title="Genera una contraseña aleatoria de alta seguridad"
                        disabled={loading}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                          <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Generar segura
                      </button>
                    </div>

                    <p className="sub" style={{ margin: "8px 0 0", fontSize: 11.5, color: "var(--text-mid)" }}>
                      Mínimo 8 caracteres. Puedes definirla tú mismo o presionar <b>Generar segura</b>.
                    </p>
                  </div>

                  {error ? (
                    <div className="form-error" style={{ margin: "8px 0 0" }}>
                      {error}
                    </div>
                  ) : null}
                </div>

                <div className="admin-modal-actions">
                  <button
                    type="button"
                    className="btn-outline"
                    onClick={handleClose}
                    disabled={loading}
                    style={{ height: 42 }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn"
                    disabled={loading || (password.trim().length > 0 && password.trim().length < 8)}
                    style={{ width: "auto", padding: "0 22px", height: 42, fontSize: 12.5 }}
                  >
                    {loading ? (
                      <>
                        <span className="btn-spin" />
                        Guardando…
                      </>
                    ) : (
                      "Guardar contraseña"
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
