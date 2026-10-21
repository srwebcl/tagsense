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
import { AdminShell } from "@/app/admin/_components/AdminShell";
import { CategoriasManager } from "./CategoriasManager";
import {
  crearCategoriaFalla,
  crearTipoFicha,
  crearTipoDeActivo,
  alternarComponenteDeTipo,
  eliminarCategoriaFalla,
  editarCategoriaFalla,
  eliminarTipoFicha,
  editarTipoFicha,
  eliminarTipoDeActivo,
  editarTipoDeActivo,
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
    <AdminShell userName={appUser.full_name || appUser.email} userRole={appUser.role}>
      <div className="admin-container admin-container-wide">
        <div className="admin-page-head">
          <div>
            <h1>Categorías y Catálogos</h1>
            <p className="sub">
              Catálogos compartidos por toda la flota: tipos de activo, componentes y secciones de ficha técnica.
            </p>
          </div>
        </div>

        <CategoriasManager
          tiposActivo={tiposActivo}
          sistemas={sistemas}
          tipos={tipos}
          plantillas={plantillas}
          usoTipoActivo={usoTipoActivo}
          usoSistema={usoSistema}
          usoTipoFicha={usoTipoFicha}
          crearCategoriaFalla={crearCategoriaFalla}
          editarCategoriaFalla={editarCategoriaFalla}
          eliminarCategoriaFalla={eliminarCategoriaFalla}
          crearTipoDeActivo={crearTipoDeActivo}
          editarTipoDeActivo={editarTipoDeActivo}
          eliminarTipoDeActivo={eliminarTipoDeActivo}
          crearTipoFicha={crearTipoFicha}
          editarTipoFicha={editarTipoFicha}
          eliminarTipoFicha={eliminarTipoFicha}
          alternarComponenteDeTipo={alternarComponenteDeTipo}
        />
      </div>
    </AdminShell>
  );
}
