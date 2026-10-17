-- TAGSENSE — getCurrentAppUser() resuelve el usuario de negocio por
-- `select ... from users where email = $1 limit 1`, sin tenant_id en el
-- filtro (no puede haberlo: la sesión todavía no sabe a qué tenant pertenece,
-- ese es justamente el dato que esta consulta tiene que resolver).
--
-- El problema: `users` solo garantizaba email único POR TENANT
-- (unique(tenant_id, email)), no globalmente. Nada en la app implementa
-- selector de tenant ni sesión con "tenant activo" — el login es un simple
-- email+clave que asume una sola fila posible. Si el mismo correo llegara a
-- existir en dos tenants (ej. un contratista que trabaja para dos clientes),
-- esa query devolvería una fila u otra de forma no determinística según el
-- plan de ejecución, haciendo trabajar al usuario silenciosamente contra el
-- tenant equivocado.
--
-- Mientras no exista una función real de multi-tenencia por usuario (selector
-- de tenant, sesión con tenant activo, etc.), el contrato real del sistema es
-- "un correo = un tenant" — así que se hace cumplir a nivel de base de datos
-- en vez de dejarlo como una promesa rota de la constraint anterior.
alter table users drop constraint users_tenant_id_email_key;
alter table users add constraint users_email_key unique (email);
