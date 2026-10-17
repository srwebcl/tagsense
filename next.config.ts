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
  },
  async redirects() {
    return [
      {
        // La app de campo (PWA) sigue siendo el index.html estático en /public —
        // no se reescribió como página de React todavía (ver plan de migración).
        source: "/",
        destination: "/index.html",
        permanent: false,
      },
    ];
  },
  // Sin esto, la app no mandaba ningún header de seguridad (confirmado: cero
  // headers() antes de este cambio). CSP verificado contra lo que la app
  // realmente carga: script-src queda estricto (sin inline, sin eval —
  // confirmado que app.js y los vendor libs no usan ninguno de los dos) porque
  // es la protección de mayor valor contra XSS; style-src necesita
  // 'unsafe-inline' porque tanto public/index.html como los componentes del
  // admin usan atributos style="" inline por todos lados — sacarlo habría
  // significado reescribir el CSS de toda la app, no vale el riesgo ahora.
  // img-src incluye el dominio de Neon Object Storage (fotos de activos y
  // manuales se sirven desde ahí vía URL firmada, no desde este origen).
  async headers() {
    const csp = [
      "default-src 'self'",
      "script-src 'self'",
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
