import type { MetadataRoute } from "next";

// TAGSENSE no tiene una landing pública en este dominio (esa vive en un
// proyecto aparte, tagsense-landing) — todo lo que sirve este dominio es la
// app de campo (operativa, no indexable: ya trae su propio noindex en
// public/index.html) y el panel admin (ver app/admin/layout.tsx). No hay
// nada acá que deba aparecer en buscadores.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: "/",
    },
  };
}
