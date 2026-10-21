import { createNeonAuth } from "@neondatabase/auth/next/server";
import { headers } from "next/headers";

const rawAuth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  cookies: { secret: process.env.NEON_AUTH_COOKIE_SECRET! },
});

const originalGetSession = rawAuth.getSession.bind(rawAuth);

rawAuth.getSession = (async (...args: Parameters<typeof originalGetSession>) => {
  try {
    return await originalGetSession(...args);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    // En Next.js App Router Server Components (RSC), escribir cookies está prohibido.
    // Si @neondatabase/auth intenta rotar cookies durante un GET/soft-nav, Next.js arroja:
    // "Cookies can only be modified in a Server Action or Route Handler".
    // Interceptamos esto y consultamos Neon Auth en modo solo-lectura para que el Server Component
    // no aborte con 500 y no corrompa el stream de React (evitando chunk.reason.enqueueModel is not a function).
    if (errorMsg.includes("Cookies can only be modified")) {
      try {
        const headerStore = await headers();
        const cookiesStr = headerStore.get("cookie") || "";
        const res = await fetch(`${process.env.NEON_AUTH_BASE_URL}/get-session`, {
          headers: {
            Cookie: cookiesStr,
            "x-neon-auth-proxy": "nextjs",
          },
          cache: "no-store",
        });
        if (res.ok) {
          const data = await res.json();
          return { data, error: null };
        }
      } catch (fetchErr) {
        console.error("[auth.getSession fallback] Error fetching session:", fetchErr);
      }
    }
    throw err;
  }
}) as typeof originalGetSession;

export const auth = rawAuth;

