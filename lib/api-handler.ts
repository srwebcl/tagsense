// Red de seguridad mínima para cada route handler: si algo revienta sin que el
// propio handler lo haya previsto (conexión caída, violación de constraint,
// lo que sea), hoy eso se convertía en un 500 genérico de Next.js sin ningún
// rastro — ni en Vercel, ni en ningún lado. Esto al menos deja un console.error
// con el nombre de la ruta antes de responder, para que un fallo en producción
// sea debuggeable en vez de invisible.
// Next.js implementa redirect()/notFound() (usados por requireAdmin(), ver
// lib/require-admin.ts) lanzando un error especial con un `digest` que arranca
// con "NEXT_" — el framework depende de que ese error siga subiendo sin que
// nadie en el medio lo trague. Si lo atrapáramos como un error cualquiera,
// requireAdmin() dejaría de redirigir al login y devolvería un 500 en su lugar.
function esSenalDeControlDeNextjs(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "digest" in err &&
    typeof (err as { digest?: unknown }).digest === "string" &&
    (err as { digest: string }).digest.startsWith("NEXT_")
  );
}

export function withErrorLogging<Args extends unknown[]>(
  routeName: string,
  handler: (request: Request, ...args: Args) => Promise<Response>
) {
  return async (request: Request, ...args: Args): Promise<Response> => {
    try {
      return await handler(request, ...args);
    } catch (err) {
      if (esSenalDeControlDeNextjs(err)) throw err;
      console.error(`[api:${routeName}] error no manejado:`, err);
      return Response.json(
        { error: { code: "internal_error", message: "Ocurrió un error inesperado. Intenta de nuevo." } },
        { status: 500 }
      );
    }
  };
}
