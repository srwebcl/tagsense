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
};

export default nextConfig;
