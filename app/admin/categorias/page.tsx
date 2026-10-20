import { requireAdmin } from "@/lib/require-admin";
import { pool } from "@/lib/db";
import {
  listarCategoriasFalla,
  listarTiposFicha,
  listarPlantillasPorTipo,
  contarActivosPorTipo,
  contarActivosPorSistema,
  contarDocumentosPorTipoFicha,
} from "@/lib/fault-categories";
import { AdminTopbar } from "@/app/admin/_components/AdminTopbar";
import { CatalogoTabla } from "@/app/admin/_components/CatalogoTabla";
import { PlantillaPorTipo } from "@/app/admin/_components/PlantillaPorTipo";
import {
  crearCategoriaFalla,
  crearTipoFicha,
  crearTipoDeActivo,
  alternarComponenteDeTipo,
  eliminarCategoriaFalla,
  eliminarTipoFicha,
  eliminarTipoDeActivo,
} from "./actions";

export default async function CategoriasPage() {
  const appUser = await requireAdmin();

  const [sistemas, tipos, tiposActivoResult, plantillas, usoTipoActivo, usoSistema, usoTipoFicha] = await Promise.all([
    listarCategoriasFalla(appUser.tenant_id),
    listarTiposFicha(appUser.tenant_id),
    pool.query<{ name: string }>(`select name from asset_types where tenant_id = $1 order by name`, [appUser.tenant_id]),
    listarPlantillasPorTipo(appUser.tenant_id),
    contarActivosPorTipo(appUser.tenant_id),
    contarActivosPorSistema(appUser.tenant_id),
    contarDocumentosPorTipoFicha(appUser.tenant_id),
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
          <div>
            <p className="section-label" style={{ marginBottom: 6 }}>Tipos de activo</p>
            <p className="sub" style={{ marginBottom: 16 }}>Clasificación de equipos disponible al crear o editar un activo.</p>
            <CatalogoTabla
              items={tiposActivo.map((t) => ({ key: t, label: t, count: usoTipoActivo[t] || 0 }))}
              unidad="activo"
              fieldName="nombre_tipo_activo"
              placeholder="Nuevo tipo de activo"
              crearAction={crearTipoDeActivo}
              eliminarAction={eliminarTipoDeActivo}
            />
          </div>

          <div>
            <p className="section-label" style={{ marginBottom: 6 }}>Sistemas del equipo</p>
            <p className="sub" style={{ marginBottom: 16 }}>Componentes que conforman la ficha técnica y el diagnóstico guiado del Asistente.</p>
            <CatalogoTabla
              items={sistemas.map((s) => ({ key: s.slug, label: s.name, count: usoSistema[s.slug] || 0 }))}
              unidad="activo"
              fieldName="nombre_categoria"
              placeholder="Nuevo sistema"
              crearAction={crearCategoriaFalla}
              eliminarAction={eliminarCategoriaFalla}
            />
          </div>

          <div>
            <p className="section-label" style={{ marginBottom: 6 }}>Secciones de la ficha técnica</p>
            <p className="sub" style={{ marginBottom: 16 }}>Información que se completa para cada sistema de un activo.</p>
            <CatalogoTabla
              items={tipos.map((t) => ({ key: t.slug, label: t.name, count: usoTipoFicha[t.slug] || 0 }))}
              unidad="documento"
              fieldName="nombre_tipo"
              placeholder="Nueva sección"
              crearAction={crearTipoFicha}
              eliminarAction={eliminarTipoFicha}
            />
          </div>
        </div>
      </div>
    </>
  );
}
