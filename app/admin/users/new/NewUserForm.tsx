"use client";

import { useActionState } from "react";
import { crearUsuario, type EstadoCrearUsuario } from "@/app/admin/users/actions";
import { SubmitButton } from "@/app/admin/_components/SubmitButton";
import { ROLES, ROLE_LABELS, ROLE_DESCRIPTIONS } from "@/lib/roles";

const ESTADO_INICIAL: EstadoCrearUsuario = {};

export function NewUserForm() {
  const [estado, formAction] = useActionState(crearUsuario, ESTADO_INICIAL);

  if (estado.exito) {
    return (
      <div className="admin-panel">
        <p className="sub" style={{ marginBottom: 10 }}>
          Usuario creado: <b>{estado.exito.email}</b>. Pásale esta contraseña por un canal seguro. No se vuelve a
          mostrar:
        </p>
        <code style={{ display: "block", background: "var(--bg-1)", padding: "10px 12px", borderRadius: 8, fontSize: 14, marginBottom: 14, userSelect: "all" }}>
          {estado.exito.password}
        </code>
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

        <p className="sub" style={{ marginBottom: 14 }}>
          La contraseña se genera automáticamente y se muestra una vez al crear el usuario. No se elige aquí.
        </p>

        <SubmitButton>Crear usuario</SubmitButton>
      </form>
    </div>
  );
}
