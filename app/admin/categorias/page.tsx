import { requireAdmin } from "@/lib/require-admin";
import { listarCategoriasFalla, listarTiposFicha } from "@/lib/fault-categories";
import { AdminTopbar } from "@/app/admin/_components/AdminTopbar";
import { NuevaCategoriaForm } from "@/app/admin/_components/NuevaCategoriaForm";
import { crearCategoriaFalla, crearTipoFicha } from "./actions";

export default async function CategoriasPage() {
  const appUser = await requireAdmin();

  const [sistemas, tipos] = await Promise.all([
    listarCategoriasFalla(appUser.tenant_id),
    listarTiposFicha(appUser.tenant_id),
  ]);

  return (
    <>
      <AdminTopbar userName={appUser.full_name || appUser.email} userRole={appUser.role} />
      <div className="admin-container admin-container-wide">
        <div className="admin-page-head">
          <div>
            <h1>Categorías</h1>
            <p className="sub">
              El catálogo que arma la ficha técnica de cada activo: qué <b>sistemas</b> del equipo existen (Frenos,
              Dirección...) y qué <b>tipo de información</b> se carga para cada uno (Equipamiento, Fallas
              principales...). Los tiles de &quot;Tengo una falla en...&quot; de la app de campo salen directo de
              los sistemas de acá.
            </p>
          </div>
        </div>

        <div className="categorias-grid">
          <div className="admin-panel">
            <p className="section-label" style={{ marginBottom: 6 }}>Sistemas del equipo</p>
            <p className="sub" style={{ marginBottom: 16 }}>
              Cada uno aparece como un tile en el Asistente de la app de campo.
            </p>
            <div className="chip-list" style={{ marginBottom: 18 }}>
              {sistemas.map((s) => (
                <span key={s.slug} className="badge">
                  {s.name}
                </span>
              ))}
            </div>
            <NuevaCategoriaForm
              action={crearCategoriaFalla}
              fieldName="nombre_categoria"
              label="Nombre del sistema"
              placeholder="Ej: Neumáticos"
              linkLabel="+ Agregar sistema nuevo"
            />
          </div>

          <div className="admin-panel">
            <p className="section-label" style={{ marginBottom: 6 }}>Tipos de ficha</p>
            <p className="sub" style={{ marginBottom: 16 }}>
              Cada sistema se completa con esta misma lista de secciones (Equipamiento, Fallas principales...).
            </p>
            <div className="chip-list" style={{ marginBottom: 18 }}>
              {tipos.map((t) => (
                <span key={t.slug} className="badge">
                  {t.name}
                </span>
              ))}
            </div>
            <NuevaCategoriaForm
              action={crearTipoFicha}
              fieldName="nombre_tipo"
              label="Nombre del tipo de ficha"
              placeholder="Ej: Repuestos recomendados"
              linkLabel="+ Agregar tipo de ficha nuevo"
            />
          </div>
        </div>
      </div>
    </>
  );
}
