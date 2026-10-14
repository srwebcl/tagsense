import { pool } from "@/lib/db";
import { uploads } from "@/lib/storage";

// Identificación pública de un activo por el código del tag — sin login.
// Un QR/NFC físico pegado a un equipo es, por naturaleza, un identificador
// público (cualquiera que esté parado frente al equipo puede leerlo); por eso
// esta ruta no exige sesión, a diferencia de /api/assets/[tag_code] (que sí
// la exige porque alimenta la ficha técnica completa: historial, documentos,
// specs). Solo expone el mismo subconjunto de campos que ya se muestra en la
// tarjeta resumida (step-confirm-2) antes de pedir usuario y contraseña.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ tag_code: string }> }
) {
  const { tag_code } = await params;

  // Sin filtro por tenant_id a propósito: no hay sesión de la cual resolverlo.
  // El esquema permite tag_code repetido entre tenants distintos (unique es
  // compuesto, (tenant_id, tag_code)) — hoy solo existe un tenant real, así que
  // no es ambiguo, pero si se suma un segundo cliente habrá que decidir cómo
  // desambiguar (ej. prefijo de tag_code por cliente) antes de que lo sea.
  const result = await pool.query(
    `select tag_code, name, model, serial_number, status, location, hour_meter,
            asset_type, manufacturer, manufacture_year, photo_url
     from assets
     where tag_code = $1
     limit 1`,
    [tag_code]
  );

  const asset = result.rows[0];
  if (!asset) {
    return Response.json({ error: { code: "not_found", message: "Activo no encontrado para este código." } }, { status: 404 });
  }

  if (asset.photo_url) {
    asset.photo_url = await uploads.url(asset.photo_url, { expiresIn: 3600 });
  }

  return Response.json(asset);
}
