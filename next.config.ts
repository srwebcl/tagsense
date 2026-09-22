import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
