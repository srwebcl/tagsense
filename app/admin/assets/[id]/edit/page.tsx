import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/require-admin";
import { pool } from "@/lib/db";
import { uploads } from "@/lib/storage";
import { actualizarActivo } from "@/app/admin/assets/actions";
import { AdminTopbar } from "@/app/admin/_components/AdminTopbar";
import { SubmitButton } from "@/app/admin/_components/SubmitButton";
import { FileDropzone } from "@/app/admin/_components/FileDropzone";
import { AssetTypeSelect } from "@/app/admin/_components/AssetTypeSelect";

export default async function EditAssetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const appUser = await requireAdmin();
  const { id } = await params;

  const assetResult = await pool.query(
    `select id, tag_code, name, model, serial_number, status, location,
            asset_type, manufacturer, manufacture_year, specs, photo_url
     from assets where tenant_id = $1 and id = $2 limit 1`,
    [appUser.tenant_id, id]
  );
  const asset = assetResult.rows[0];
  if (!asset) notFound();

  const specs = asset.specs || {};
  const photoUrl = asset.photo_url ? await uploads.url(asset.photo_url, { expiresIn: 3600 }) : null;
  const actualizarEsteActivo = actualizarActivo.bind(null, id);

  const typesResult = await pool.query(`select name from asset_types where tenant_id = $1 order by name`, [appUser.tenant_id]);
  const tipoOptions = typesResult.rows.map((r) => r.name);

  return (
    <>
      <AdminTopbar userName={appUser.full_name || appUser.email} userRole={appUser.role} />
      <div className="admin-container" style={{ maxWidth: 560 }}>
        <Link href={`/admin/assets/${id}`} className="link-back">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {asset.name}
        </Link>

        <div className="admin-page-head">
          <div>
            <h1>Editar activo</h1>
            <p className="sub">
              Código del tag: <b>{asset.tag_code}</b> — no se puede cambiar acá porque ya está impreso/grabado en el
              QR o NFC pegado al equipo.
            </p>
          </div>
        </div>

        <div className="admin-panel">
          <form action={actualizarEsteActivo}>
            <div className="field">
              <label>Foto principal</label>
              {photoUrl ? (
                <img src={photoUrl} alt={asset.name} style={{ width: 64, height: 64, borderRadius: 12, objectFit: "cover", marginBottom: 10 }} />
              ) : null}
              <FileDropzone
                name="photo"
                accept="image/*"
                required={false}
                label="Elegir foto del activo"
                hint={photoUrl ? "Deja vacío para mantener la foto actual." : "Opcional — se usa en la ficha de la app de campo."}
              />
            </div>

            <div className="field">
              <label>Nombre <span className="req">*</span></label>
              <div className="input-wrap">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M3 17h18M5 17V9l7-5 7 5v8" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                </svg>
                <input name="name" required defaultValue={asset.name} />
              </div>
            </div>

            <div className="field">
              <label>Tipo de activo</label>
              <AssetTypeSelect options={tipoOptions} defaultValue={asset.asset_type} />
            </div>

            <div className="field">
              <label>Fabricante</label>
              <div className="input-wrap">
                <input name="manufacturer" defaultValue={asset.manufacturer || ""} placeholder="Epiroc" />
              </div>
            </div>

            <div className="field">
              <label>Modelo</label>
              <div className="input-wrap">
                <input name="model" defaultValue={asset.model || ""} placeholder="MT65S" />
              </div>
            </div>

            <div className="field">
              <label>N° de serie</label>
              <div className="input-wrap">
                <input name="serial_number" defaultValue={asset.serial_number || ""} placeholder="CAT0MT65SFKY100123" />
              </div>
            </div>

            <div className="field">
              <label>Año de fabricación</label>
              <div className="input-wrap">
                <input name="manufacture_year" type="number" min="1950" max="2100" defaultValue={asset.manufacture_year || ""} placeholder="2021" />
              </div>
            </div>

            <div className="field">
              <label>País de fabricación</label>
              <div className="input-wrap">
                <input name="specs_country_of_origin" defaultValue={specs.country_of_origin || ""} placeholder="Suecia" />
              </div>
            </div>

            <div className="field">
              <label>Peso operacional</label>
              <div className="input-wrap">
                <input name="specs_operating_weight" defaultValue={specs.operating_weight || ""} placeholder="62.000 kg" />
              </div>
            </div>

            <div className="field">
              <label>Capacidad de carga</label>
              <div className="input-wrap">
                <input name="specs_load_capacity" defaultValue={specs.load_capacity || ""} placeholder="65 toneladas" />
              </div>
            </div>

            <div className="field">
              <label>Tipo de motor</label>
              <div className="input-wrap">
                <input name="specs_engine_type" defaultValue={specs.engine_type || ""} placeholder="Diésel" />
              </div>
            </div>

            <div className="field">
              <label>Potencia</label>
              <div className="input-wrap">
                <input name="specs_power" defaultValue={specs.power || ""} placeholder="390 kW (523 HP)" />
              </div>
            </div>

            <div className="field">
              <label>Ubicación</label>
              <div className="input-wrap">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M12 21s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12Z" stroke="currentColor" strokeWidth="1.6" />
                  <circle cx="12" cy="9" r="2.4" stroke="currentColor" strokeWidth="1.6" />
                </svg>
                <input name="location" defaultValue={asset.location || ""} placeholder="Mina Rajo Sur - Banco 12" />
              </div>
            </div>

            <div className="field">
              <label>Estado</label>
              <div className="chip-group">
                <input type="radio" name="status" id="st-op" value="operativo" defaultChecked={asset.status === "operativo"} />
                <label htmlFor="st-op"><span className="dot ok" />Operativo</label>

                <input type="radio" name="status" id="st-mt" value="mantenimiento" defaultChecked={asset.status === "mantenimiento"} />
                <label htmlFor="st-mt"><span className="dot warn" />Mantención</label>

                <input type="radio" name="status" id="st-fs" value="fuera_de_servicio" defaultChecked={asset.status === "fuera_de_servicio"} />
                <label htmlFor="st-fs"><span className="dot err" />Fuera de servicio</label>
              </div>
            </div>

            <SubmitButton>Guardar cambios</SubmitButton>
          </form>
        </div>
      </div>
    </>
  );
}
