import { requireAdmin } from "@/lib/require-admin";
import { pool } from "@/lib/db";
import { listarCategoriasFalla, listarTiposFicha, listarPlantillasPorTipo } from "@/lib/fault-categories";
import { AdminTopbar } from "@/app/admin/_components/AdminTopbar";
import { NuevaCategoriaForm } from "@/app/admin/_components/NuevaCategoriaForm";
import { PlantillaPorTipo } from "@/app/admin/_components/PlantillaPorTipo";
import { crearCategoriaFalla, crearTipoFicha, crearTipoDeActivo, alternarComponenteDeTipo } from "./actions";

export default async function CategoriasPage() {
  const appUser = await requireAdmin();

  const [sistemas, tipos, tiposActivoResult, plantillas] = await Promise.all([
    listarCategoriasFalla(appUser.tenant_id),
    listarTiposFicha(appUser.tenant_id),
    pool.query<{ name: string }>(`select name from asset_types where tenant_id = $1 order by name`, [appUser.tenant_id]),
    listarPlantillasPorTipo(appUser.tenant_id),
  ]);
  const tiposActivo = tiposActivoResult.rows.map((r) => r.name);

  return (
    <>
      <AdminTopbar userName={appUser.full_name || appUser.email} userRole={appUser.role} />
      <div className="admin-container admin-container-wide">
        <div className="admin-page-head">
          <div>
            <h1>Categorías</h1>
            <p className="sub">Catálogos compartidos por todos los activos: tipos de equipo y estructura de la ficha técnica.</p>
          </div>
        </div>

        <p className="section-label" style={{ marginBottom: 6 }}>Sistemas por tipo de activo</p>
        <p className="sub" style={{ marginBottom: 16 }}>
          Define qué sistemas trae un activo nuevo según su tipo. Los activos existentes no cambian; se editan desde
          su propia ficha técnica.
        </p>
        <div className="admin-panel" style={{ marginBottom: 24 }}>
          <PlantillaPorTipo tiposActivo={tiposActivo} sistemas={sistemas} plantillas={plantillas} action={alternarComponenteDeTipo} />
        </div>

        <div className="categorias-grid">
          <div className="admin-panel">
            <p className="section-label" style={{ marginBottom: 6 }}>Tipos de activo</p>
            <p className="sub" style={{ marginBottom: 16 }}>Clasificación de equipos disponible al crear o editar un activo.</p>
            <div className="chip-list" style={{ marginBottom: 18 }}>
              {tiposActivo.map((t) => (
                <span key={t} className="badge">
                  {t}
                </span>
              ))}
            </div>
            <NuevaCategoriaForm
              action={crearTipoDeActivo}
              fieldName="nombre_tipo_activo"
              label="Nombre del tipo de activo"
              placeholder="Ej: Perforadora"
              linkLabel="+ Agregar tipo de activo"
            />
          </div>

          <div className="admin-panel">
            <p className="section-label" style={{ marginBottom: 6 }}>Sistemas del equipo</p>
            <p className="sub" style={{ marginBottom: 16 }}>Componentes que conforman la ficha técnica y el diagnóstico guiado del Asistente.</p>
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
              linkLabel="+ Agregar sistema"
            />
          </div>

          <div className="admin-panel">
            <p className="section-label" style={{ marginBottom: 6 }}>Secciones de la ficha técnica</p>
            <p className="sub" style={{ marginBottom: 16 }}>Información que se completa para cada sistema de un activo.</p>
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
              label="Nombre de la sección"
              placeholder="Ej: Repuestos recomendados"
              linkLabel="+ Agregar sección"
            />
          </div>
        </div>
      </div>
    </>
  );
}
