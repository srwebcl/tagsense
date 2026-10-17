import { pool } from "@/lib/db";

// Límite de tasa básico respaldado en Postgres (tabla rate_limit_hits, ver
// migración 0008) — no hay Redis/KV en este stack todavía, y esto evita sumar
// una dependencia nueva solo para esto. No es exacto bajo concurrencia extrema,
// pero sube el costo de abuso de "trivial" a "requiere esfuerzo real", que es
// lo que hace falta antes de lanzar.
//
// Cada llamada también borra sus propias filas vencidas, así la tabla no
// crece sin límite sin necesitar un cron de limpieza aparte.
export async function checkRateLimit(
  bucketKey: string,
  maxHits: number,
  windowSeconds: number
): Promise<{ limited: boolean; remaining: number }> {
  await pool.query(
    `delete from rate_limit_hits where bucket_key = $1 and created_at < now() - ($2 || ' seconds')::interval`,
    [bucketKey, windowSeconds]
  );

  const countResult = await pool.query<{ count: string }>(
    `select count(*)::text as count from rate_limit_hits where bucket_key = $1`,
    [bucketKey]
  );
  const current = parseInt(countResult.rows[0]?.count ?? "0", 10);

  if (current >= maxHits) {
    return { limited: true, remaining: 0 };
  }

  await pool.query(`insert into rate_limit_hits (bucket_key) values ($1)`, [bucketKey]);
  return { limited: false, remaining: maxHits - current - 1 };
}

// Vercel reenvía la IP real del cliente en x-forwarded-for (primer valor de la
// lista); sin eso, cae a "unknown" — igual sirve para agrupar un mismo cliente
// dentro de una misma conexión/sesión de pruebas locales.
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown";
}
