import { auth } from "@/lib/auth/server";

export default auth.middleware({
  loginUrl: "/admin/login",
});

export const config = {
  matcher: [
    /*
     * Aplica a las rutas del panel administrativo (/admin),
     * excluyendo archivos estáticos y assets.
     */
    "/admin",
    "/admin/:path*",
  ],
};
