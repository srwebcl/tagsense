-- "Mantenedor" tenía exactamente el mismo acceso que "Técnico" en todo el
-- código (ningún chequeo de rol los distinguía) — la única diferencia era de
-- clasificación dentro del informe generado, no de permisos. Se saca como
-- opción de rol para no ofrecer una distinción que no existe (ver app/admin
-- antes de este cambio y lib/roles.ts). No había ningún usuario con este rol
-- al momento de la migración (confirmado con select antes de aplicar).
alter table users drop constraint users_role_check;
alter table users add constraint users_role_check check (role in ('technician', 'admin'));
