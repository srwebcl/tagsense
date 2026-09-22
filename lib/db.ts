import { Pool } from "pg";
import { attachDatabasePool } from "@vercel/functions";

// Se conecta como app_user (sin privilegios de DDL), NUNCA como neondb_owner —
// ese se reserva para migraciones. Nota importante: en Neon, todo rol creado vía
// `neon roles create` incluye el atributo BYPASSRLS a nivel de plataforma y no se
// puede revocar (ALTER ROLE lo rechaza por permisos). Es decir, las policies de
// RLS declaradas en la migración 0001 no se aplican a esta conexión — quedan como
// respaldo para otros caminos de acceso (ej. Data API), no como la defensa real.
// La guía oficial de Neon lo confirma: "Enforce authorization in the Function
// instead of relying on browser-facing RLS". Por eso TODA query de este archivo
// filtra explícitamente por tenant_id — esa es la capa que de verdad aísla tenants.
const pool = new Pool({ connectionString: process.env.APP_DATABASE_URL });
attachDatabasePool(pool);

export { pool };
