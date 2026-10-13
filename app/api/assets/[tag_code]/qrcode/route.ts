import QRCode from "qrcode";
import { requireAdmin } from "@/lib/require-admin";
import { pool } from "@/lib/db";

// Genera el QR al vuelo a partir del tag_code — nada que guardar ni mantener
// sincronizado; si el dominio cambia (ej. a tagsense.cl), el QR se arma con
// el origen de la request actual, sin tocar código.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ tag_code: string }> }
) {
  const appUser = await requireAdmin();
  const { tag_code } = await params;

  const result = await pool.query(
    `select tag_code from assets where tenant_id = $1 and tag_code = $2 limit 1`,
    [appUser.tenant_id, tag_code]
  );
  const asset = result.rows[0];
  if (!asset) {
    return Response.json({ error: { code: "not_found", message: "Activo no encontrado." } }, { status: 404 });
  }

  const origin = new URL(request.url).origin;
  const targetUrl = `${origin}/index.html?activo=${encodeURIComponent(asset.tag_code)}`;

  const png = await QRCode.toBuffer(targetUrl, {
    type: "png",
    width: 640,
    margin: 2,
    color: { dark: "#0a0a0b", light: "#ffffff" },
  });

  const download = new URL(request.url).searchParams.get("download") === "1";

  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-store",
      ...(download
        ? { "Content-Disposition": `attachment; filename="qr-${asset.tag_code}.png"` }
        : {}),
    },
  });
}
