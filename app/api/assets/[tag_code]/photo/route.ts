import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { uploads } from "@/lib/storage";

// Endpoint de alto rendimiento para servir la fotografía del activo con caché HTTP agresivo.
// Al usar ETag y Cache-Control (30 días), el navegador descarga la imagen una sola vez
// y luego la sirve directamente desde memoria/disco local (0 ms de demora, 0 costo en Vercel).
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tag_code: string }> }
) {
  try {
    const { tag_code: id } = await params;

    // Acepta tanto UUID del activo como tag_code (ej. ACT-001)
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const result = await pool.query(
      isUuid
        ? `select photo_url from assets where id = $1 limit 1`
        : `select photo_url from assets where tag_code = $1 limit 1`,
      [id]
    );

    const photoKey = result.rows[0]?.photo_url;
    if (!photoKey) {
      return new NextResponse("Foto no encontrada", { status: 404 });
    }

    const etag = `"${encodeURIComponent(photoKey)}"`;
    if (request.headers.get("if-none-match") === etag) {
      return new Response(null, {
        status: 304,
        headers: {
          "Cache-Control": "public, max-age=2592000, stale-while-revalidate=86400, immutable",
          "ETag": etag,
        },
      });
    }

    const file = await uploads.download(photoKey);
    const arrayBuffer = await file.arrayBuffer();

    let contentType = "image/webp";
    const lower = photoKey.toLowerCase();
    if (lower.endsWith(".png")) contentType = "image/png";
    else if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) contentType = "image/jpeg";

    return new Response(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=2592000, stale-while-revalidate=86400, immutable",
        "ETag": etag,
      },
    });
  } catch (err) {
    console.error("Error al obtener foto de activo:", err);
    return new NextResponse("Error interno al cargar foto", { status: 500 });
  }
}
