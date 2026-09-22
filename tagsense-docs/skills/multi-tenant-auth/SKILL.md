---
name: multi-tenant-auth
description: Usar esta guía SIEMPRE que se cree una tabla nueva, se escriba una query, o se implemente autenticación/autorización. Define el patrón obligatorio de aislamiento entre empresas clientes (tenants) — es la garantía de seguridad más importante del producto.
---

# Skill: Multi-tenancy y Autenticación

## Por qué es crítico
TAGSENSE se vende a varias empresas mineras (multi-tenant). Un error de aislamiento — que el manual, activo o informe de una empresa aparezca visible para otra — no es un bug menor, es una falla de seguridad grave con implicancias contractuales serias en clientes industriales.

## Modelo elegido
**Multi-tenant compartido**: una sola base de datos, aislamiento lógico por `tenant_id` en cada tabla de negocio. No instancias separadas por cliente (más caro de operar y mantener actualizado) salvo excepción explícita para un cliente Enterprise que lo exija contractualmente.

## Patrón obligatorio

1. **Toda tabla de negocio tiene columna `tenant_id`** (ver `/docs/DATABASE_SCHEMA.md`). No hay excepciones para tablas nuevas — si se agrega una tabla y no está claro si necesita `tenant_id`, la respuesta por defecto es sí.
2. **Row Level Security (RLS) activado en Postgres/Supabase** desde el día 1, no como mejora posterior. Política base por tabla:
   ```sql
   CREATE POLICY tenant_isolation ON <tabla>
     USING (tenant_id = current_setting('app.current_tenant')::uuid);
   ```
   `app.current_tenant` se setea por conexión/request a partir del tenant resuelto en la sesión autenticada.
3. **Nunca confiar en un `tenant_id` que venga del cliente/frontend.** El backend siempre resuelve el tenant desde la sesión/token autenticado, nunca desde un parámetro de la request. Un usuario no debe poder, ni por error de UI ni intencionalmente, pasar el `tenant_id` de otra empresa.
4. **Toda query de aplicación filtra explícitamente por `tenant_id`** además de RLS — RLS es la última línea de defensa, no la única. Doble capa intencional.

## Roles y permisos

| Rol | Puede |
|---|---|
| `technician` | Ver/usar activos de su tenant, registrar intervenciones, usar el asistente, generar informes |
| `maintainer` | Todo lo anterior + validar/aprobar informes |
| `admin` | Todo lo anterior + gestionar usuarios, activos, documentación y configuración del tenant |

No existe un rol que cruce tenants excepto el operador de la plataforma (nosotros), que administra desde un panel separado, no desde la app de los clientes.

## Checklist antes de dar por completa cualquier tabla o endpoint nuevo
- [ ] ¿La tabla tiene `tenant_id`?
- [ ] ¿RLS está activo y probado (intentar leer datos de otro tenant debe fallar)?
- [ ] ¿El endpoint resuelve `tenant_id` desde la sesión autenticada, no desde el body/query de la request?
- [ ] ¿Existe un test que verifique que un usuario del Tenant A no puede acceder a datos del Tenant B, incluso conociendo IDs válidos?
