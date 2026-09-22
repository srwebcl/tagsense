-- TAGSENSE — Datos semilla del piloto (Etapa 1, single-tenant)
--
-- El nombre del tenant queda como placeholder: hay que renombrarlo cuando se
-- confirme el cliente piloto real, con:
--   UPDATE tenants SET name = 'Nombre real del cliente' WHERE id = (SELECT id FROM tenants LIMIT 1);
--
-- El usuario técnico usa el mismo correo que ya estaba hardcodeado en el prototipo
-- (gonzalo.quintriqueo@tagsense.cl) para que, apenas esa persona se registre de
-- verdad vía Neon Auth con ese correo, getCurrentAppUser() la resuelva contra este
-- tenant sin pasos manuales adicionales.

insert into tenants (name, plan) values
  ('Cliente Piloto (renombrar)', 'starter')
returning id;

-- (el resto de este script asume que se corre completo de una vez, usando el id recién generado)
with t as (select id from tenants where name = 'Cliente Piloto (renombrar)' limit 1)
insert into users (tenant_id, email, role, full_name)
select id, 'gonzalo.quintriqueo@tagsense.cl', 'technician', 'Gonzalo Quintriqueo'
from t;

with t as (select id from tenants where name = 'Cliente Piloto (renombrar)' limit 1)
insert into assets (tenant_id, tag_code, name, model, serial_number, status, location, hour_meter)
select id, 'TS-CAEX-0000125', 'Camión Minero MT65S', 'MT65S', 'CAT0MT65SFKY100123', 'operativo', 'Mina Rajo Sur - Banco 12', 8745
from t;
