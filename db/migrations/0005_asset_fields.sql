-- TAGSENSE — Campos de activo que la app de campo ya intentaba mostrar (o que
-- el usuario pidió explícitamente) pero no existían en el schema:
--
-- - asset_type: texto libre, no CHECK constraint — el set de tipos (camión,
--   excavadora, equipo industrial, etc.) es una taxonomía de negocio que va a
--   seguir creciendo; la UI del admin sugiere valores comunes como chips, pero
--   no se bloquea a una lista fija.
-- - manufacturer: "Fabricante" — existía como texto mock en step-info-general,
--   nunca como dato real.
-- - manufacture_year: "Año fabricación" — step-confirm-2 (c2-anio) siempre
--   mostraba '—' porque no había de dónde sacarlo.
-- - specs: jsonb para especificaciones técnicas que varían por tipo de activo
--   (peso, capacidad, potencia, etc.) — no tiene sentido una columna rígida
--   por cada posible especificación cuando un camión y una bomba no comparten
--   casi ninguna.

alter table assets
  add column asset_type text,
  add column manufacturer text,
  add column manufacture_year int,
  add column specs jsonb not null default '{}'::jsonb;
