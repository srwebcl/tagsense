"use client";

import { useActionState, useState } from "react";
import { crearUsuario, type EstadoCrearUsuario } from "@/app/admin/users/actions";
import { SubmitButton } from "@/app/admin/_components/SubmitButton";
import { ROLES, ROLE_LABELS, ROLE_DESCRIPTIONS } from "@/lib/roles";

const ESTADO_INICIAL: EstadoCrearUsuario = {};

function generarAleatoriaLocal(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 16; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

export function NewUserForm() {
  const [estado, formAction] = useActionState(crearUsuario, ESTADO_INICIAL);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!estado.exito?.password) return;
    try {
      await navigator.clipboard.writeText(estado.exito.password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      const input = document.createElement("input");
      input.value = estado.exito.password;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  }

  function handleGenerar() {
    const nueva = generarAleatoriaLocal();
    setPassword(nueva);
    setShowPassword(true);
  }

  if (estado.exito) {
    return (
      <div className="admin-panel">
        <p className="sub" style={{ marginBottom: 12 }}>
          Usuario creado: <b>{estado.exito.email}</b>. Pásale esta contraseña por un canal seguro:
        </p>
        <div className="pw-display-code" style={{ marginBottom: 16 }}>
          <span>{estado.exito.password}</span>
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
        <a href="/admin/users" className="btn-outline">
          Volver a Usuarios
        </a>
      </div>
    );
  }

  return (
    <div className="admin-panel">
      <form action={formAction}>
        <div className="field">
          <label>
            Correo <span className="req">*</span>
          </label>
          <div className="input-wrap">
            <input name="email" type="email" required placeholder="tecnico@tagsense.cl" />
          </div>
        </div>

        <div className="field">
          <label>
            Nombre completo <span className="req">*</span>
          </label>
          <div className="input-wrap">
            <input name="full_name" required placeholder="Juan Pérez" />
          </div>
        </div>

        <div className="field">
          <label>
            Contraseña <span style={{ color: "var(--text-low)", fontWeight: 500, textTransform: "none", fontSize: 11 }}>(Opcional)</span>
          </label>
          <div className="pw-input-box">
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Dejar en blanco para generar automáticamente"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
            />
            <button
              type="button"
              className="pw-tool-btn"
              onClick={() => setShowPassword(!showPassword)}
              title={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
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
              title="Generar contraseña segura"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Generar segura
            </button>
          </div>
          <p className="sub" style={{ margin: "6px 0 0", fontSize: 11.5 }}>
            Puedes escribir una contraseña personalizada (mínimo 8 caracteres) o dejarla en blanco para que TAGSENSE genere una segura.
          </p>
        </div>

        <div className="field">
          <label>Rol</label>
          <div className="role-option-group">
            {ROLES.map((rol) => (
              <div key={rol}>
                <input type="radio" name="role" id={`role-${rol}`} value={rol} defaultChecked={rol === "technician"} />
                <label htmlFor={`role-${rol}`}>
                  <span className="role-option-title">{ROLE_LABELS[rol]}</span>
                  <span className="role-option-desc">{ROLE_DESCRIPTIONS[rol]}</span>
                </label>
              </div>
            ))}
          </div>
        </div>

        {estado.error ? (
          <p className="sub" style={{ color: "var(--err)", marginBottom: 14 }}>
            {estado.error}
          </p>
        ) : null}

        <SubmitButton>Crear usuario</SubmitButton>
      </form>
    </div>
  );
}

