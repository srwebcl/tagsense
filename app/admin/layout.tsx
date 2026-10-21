import type { Metadata } from "next";
import "./admin.css";

// Panel interno — nunca debe quedar indexado ni aparecer en resultados de
// búsqueda. robots.txt (ver app/robots.ts) ya lo excluye, pero un meta
// noindex es la señal más fuerte (sobrevive aunque algo linkee la URL).
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="admin-root">{children}</div>;
}
