-- TAGSENSE — Foto principal del activo.
--
-- Igual que los manuales (asset_documents), se guarda solo la key del objeto
-- en Object Storage, no la URL: la URL firmada se resuelve al leer (ver
-- uploads.url() en app/api/assets/[tag_code]/route.ts y en el panel admin).
-- Opcional a propósito — un activo sin foto cae al placeholder genérico en la
-- app de campo (ver TRUCK_PHOTO en public/assets/js/app.js).

alter table assets
  add column photo_url text;
