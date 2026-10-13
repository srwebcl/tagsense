import Link from "next/link";
import { requireAdmin } from "@/lib/require-admin";
import { crearActivo } from "@/app/admin/assets/actions";
import { AdminTopbar } from "@/app/admin/_components/AdminTopbar";
import { SubmitButton } from "@/app/admin/_components/SubmitButton";
import { FileDropzone } from "@/app/admin/_components/FileDropzone";

export default async function NewAssetPage() {
  const appUser = await requireAdmin();

  return (
    <>
      <AdminTopbar userName={appUser.full_name || appUser.email} />
      <div className="admin-container" style={{ maxWidth: 560 }}>
        <Link href="/admin" className="link-back">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Activos
        </Link>

        <div className="admin-page-head">
          <div>
            <h1>Nuevo activo</h1>
            <p className="sub">Se identifica en terreno escaneando el código del tag (QR o NFC).</p>
          </div>
        </div>

        <div className="admin-panel">
          <form action={crearActivo}>
            <div className="field">
              <label>Código del tag <span className="req">*</span></label>
              <div className="input-wrap">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.6" />
                  <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.6" />
                  <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.6" />
                </svg>
                <input name="tag_code" required placeholder="TS-CAEX-0000126" />
              </div>
            </div>

            <div className="field">
              <label>Foto principal</label>
              <FileDropzone
                name="photo"
                accept="image/*"
                required={false}
                label="Elegir foto del activo"
                hint="Opcional — se usa en la ficha de la app de campo."
              />
            </div>

            <div className="field">
              <label>Nombre <span className="req">*</span></label>
              <div className="input-wrap">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M3 17h18M5 17V9l7-5 7 5v8" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                </svg>
                <input name="name" required placeholder="Camión Minero MT65S" />
              </div>
            </div>

            <div className="field">
              <label>Tipo de activo</label>
              <div className="input-wrap">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="7" width="18" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
                  <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="1.6" />
                </svg>
                <input name="asset_type" list="asset-type-options" placeholder="Camión minero" />
              </div>
              <datalist id="asset-type-options">
                <option value="Camión minero" />
                <option value="Camión de apoyo" />
                <option value="Excavadora" />
                <option value="Cargador frontal" />
                <option value="Perforadora" />
                <option value="Planta de chancado" />
                <option value="Grúa" />
                <option value="Bomba" />
                <option value="Compresor" />
                <option value="Generador" />
                <option value="Vehículo liviano" />
                <option value="Equipo industrial" />
                <option value="Maquinaria" />
                <option value="Otro" />
              </datalist>
            </div>

            <div className="field">
              <label>Fabricante</label>
              <div className="input-wrap">
                <input name="manufacturer" placeholder="Epiroc" />
              </div>
            </div>

            <div className="field">
              <label>Modelo</label>
              <div className="input-wrap">
                <input name="model" placeholder="MT65S" />
              </div>
            </div>

            <div className="field">
              <label>N° de serie</label>
              <div className="input-wrap">
                <input name="serial_number" placeholder="CAT0MT65SFKY100123" />
              </div>
            </div>

            <div className="field">
              <label>Año de fabricación</label>
              <div className="input-wrap">
                <input name="manufacture_year" type="number" min="1950" max="2100" placeholder="2021" />
              </div>
            </div>

            <div className="field">
              <label>Ubicación</label>
              <div className="input-wrap">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M12 21s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12Z" stroke="currentColor" strokeWidth="1.6" />
                  <circle cx="12" cy="9" r="2.4" stroke="currentColor" strokeWidth="1.6" />
                </svg>
                <input name="location" placeholder="Mina Rajo Sur - Banco 12" />
              </div>
            </div>

            <div className="field">
              <label>Estado</label>
              <div className="chip-group">
                <input type="radio" name="status" id="st-op" value="operativo" defaultChecked />
                <label htmlFor="st-op"><span className="dot ok" />Operativo</label>

                <input type="radio" name="status" id="st-mt" value="mantenimiento" />
                <label htmlFor="st-mt"><span className="dot warn" />Mantención</label>

                <input type="radio" name="status" id="st-fs" value="fuera_de_servicio" />
                <label htmlFor="st-fs"><span className="dot err" />Fuera de servicio</label>
              </div>
            </div>

            <SubmitButton>Crear activo</SubmitButton>
          </form>
        </div>
      </div>
    </>
  );
}
