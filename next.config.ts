import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse (indexado de manuales para el asistente IA) necesita pdfjs-dist
  // fuera del bundle del servidor — si no, el worker no encuentra su propio
  // archivo .mjs dentro del chunk de Turbopack (ver docs/troubleshooting.md
  // del paquete, sección Next.js/Vercel).
  serverExternalPackages: ["pdf-parse"],
  // Default es 1MB — muy poco para una foto de celular o un manual PDF escaneado
  // subidos como Server Action (crearActivo, subirFotoActivo, subirDocumento).
  experimental: {
    serverActions: {
      bodySizeLimit: "15mb",
    },
    agentUpgrade: "security",
  },
  // rewrite (no redirect): la URL se queda en "/" — el visitante nunca ve
  // ".html" en la barra de direcciones. La app de campo (PWA) sigue siendo el
  // index.html estático en /public, a propósito: tiene que funcionar 100% sin
  // conexión (técnico dentro de una mina sin señal) y un app shell estático
  // precacheado por el service worker es la forma más simple y confiable de
  // garantizar eso — no se reescribió como página de React y no va a
  // reescribirse por uniformidad con el admin (ver análisis de arquitectura).
  async rewrites() {
    return [
      {
        source: "/",
        destination: "/index.html",
      },
    ];
  },
  // Sin esto, la app no mandaba ningún header de seguridad (confirmado: cero
  // headers() antes de este cambio). script-src 'self' SIN 'unsafe-inline' se
  // probó con un browser real (Playwright) y rompe TODO el panel admin: Next
  // bootstrapea cada página con un <script> inline propio (fija
  // self.__next_r / el flight data de RSC) — el CSP lo bloquea, la hidratación
  // nunca termina, y ningún botón/formulario del admin reacciona a clicks
  // (quedó confirmado como bug real, no artefacto de Playwright: pasa igual
  // en una pestaña normal sin ninguna interacción). La alternativa correcta
  // sin 'unsafe-inline' es CSP con nonce vía Proxy (ver
  // node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md),
  // pero exige forzar renderizado dinámico en cada página del admin — no vale
  // la complejidad: no hay un solo dangerouslySetInnerHTML en toda la app
  // (confirmado por grep), así que todo el contenido que React pinta ya va
  // escapado por default: la superficie real de XSS que 'unsafe-inline'
  // reabre es mínima. style-src necesita 'unsafe-inline' por la misma razón
  // práctica, más que tanto public/index.html como los componentes del admin
  // usan atributos style="" inline por todos lados. img-src incluye el
  // dominio de Neon Object Storage (fotos de activos y manuales se sirven
  // desde ahí vía URL firmada, no desde este origen).
  async headers() {
    const isDev = process.env.NODE_ENV === "development";
    const csp = [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https://*.aws.neon.tech",
      "font-src 'self'",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join("; ");

    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        ],
      },
    ];
  },
};

export default nextConfig;
