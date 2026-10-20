import { pool } from "@/lib/db";

// Sugiere el próximo código de tag correlativo (ej. TS-CAEX-0000301 después de
// TS-CAEX-0000300) — el admin lo ve precargado en el campo pero lo puede
// editar libremente antes de crear el activo, nunca se fuerza. Usa el
// segmento de 3 letras más frecuente entre los activos existentes (si no hay
// ninguno, "AST" genérico) y el número más alto + 1, sin importar a qué
// segmento pertenecía ese número — es solo un punto de partida razonable, no
// una numeración formal por tipo de equipo (eso lo decide el admin).
export async function sugerirSiguienteTagCode(tenantId: string): Promise<string> {
  const result = await pool.query<{ tag_code: string }>(`select tag_code from assets where tenant_id = $1`, [tenantId]);

  let maxNumero = 0;
  const conteoSegmentos = new Map<string, number>();

  for (const { tag_code } of result.rows) {
    const match = tag_code.match(/^TS-([A-Z]+)-(\d+)$/);
    if (!match) continue;
    const [, segmento, numeroStr] = match;
    conteoSegmentos.set(segmento, (conteoSegmentos.get(segmento) || 0) + 1);
    const numero = parseInt(numeroStr, 10);
    if (numero > maxNumero) maxNumero = numero;
  }

  let segmentoSugerido = "AST";
  let maxConteo = 0;
  for (const [segmento, conteo] of conteoSegmentos) {
    if (conteo > maxConteo) {
      maxConteo = conteo;
      segmentoSugerido = segmento;
    }
  }

  const siguienteNumero = String(maxNumero + 1).padStart(7, "0");
  return `TS-${segmentoSugerido}-${siguienteNumero}`;
}
