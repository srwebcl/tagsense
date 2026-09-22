import Link from "next/link";
import { requireAdmin } from "@/lib/require-admin";
import { pool } from "@/lib/db";

export default async function AdminHomePage() {
  const appUser = await requireAdmin();

  const result = await pool.query(
    `select id, tag_code, name, model, status, location
     from assets
     where tenant_id = $1
     order by name`,
    [appUser.tenant_id]
  );

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold">Activos</h1>
        <Link href="/admin/assets/new" className="rounded bg-black px-4 py-2 text-sm text-white">
          + Nuevo activo
        </Link>
      </div>

      {result.rows.length === 0 ? (
        <p className="text-sm text-gray-500">Todavía no hay activos cargados.</p>
      ) : (
        <ul className="divide-y rounded border">
          {result.rows.map((asset) => (
            <li key={asset.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <Link href={`/admin/assets/${asset.id}`} className="font-medium hover:underline">
                  {asset.name}
                </Link>
                <p className="text-xs text-gray-500">
                  {asset.tag_code} · {asset.model || "sin modelo"} · {asset.status}
                </p>
              </div>
              <span className="text-xs text-gray-400">{asset.location}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
