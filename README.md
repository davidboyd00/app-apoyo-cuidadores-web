# Cliente web — Apoyo a cuidadores

**Grupo 7 · GPTI PUC 2026-2 · Entrega 10/10 (parcial) · Final 24/11/2026**

Cliente web (Vite + React + TS) de la app de apoyo a cuidadores de personas
dependientes. Consume el backend
[`caregivers-backend`](https://github.com/davidboyd00/app-apoyo-cuidadores)
y usa Supabase para auth. Hermano del cliente móvil
[`caregivers-mobile`](https://github.com/davidboyd00/app-apoyo-cuidadores-movil-).

## Stack

- **Vite** + **React 19** + **TypeScript**.
- **@supabase/supabase-js** para auth (JWT) y realtime en la bitácora.
- **@tanstack/react-query** para el estado servidor.
- **react-router-dom** para rutas.
- **oxlint** para lint (configurado por el scaffold de Vite).

## Cómo correr

```bash
npm install
cp .env.example .env         # completar con URL/keys reales
npm run dev                  # http://localhost:5173
```

Requisitos:
- Node 20+.
- Proyecto Supabase con `db/schema.sql` del backend aplicado.
- Backend corriendo (local `uvicorn` o deploy en Render).
- `CORS_ORIGINS` del backend debe incluir `http://localhost:5173` para dev.

## Estructura

```
src/
  main.tsx           entry
  App.tsx            router + providers
  lib/
    supabase.ts      cliente Supabase (localStorage)
    api.ts           fetch wrapper con JWT
  providers/
    auth-provider.tsx
    query-provider.tsx
  routes/
    sign-in.tsx
    sign-up.tsx
    home.tsx
  components/
    protected-route.tsx
docs/
  ROADMAP.md         plan por días hasta la entrega
```

## Contrato con el backend

- Toda llamada a `/patients/**` requiere `Authorization: Bearer <jwt>` (el
  JWT lo emite Supabase).
- Antes de operar contra endpoints de negocio hay que aceptar la política
  vigente (`POST /me/consent`) — si no, el backend responde 409.
- Los tipos de `app/schemas.py` del backend son la fuente de verdad del
  contrato; coordinar cambios con David.

## Convenciones

- Código y comentarios en **español** (mismo criterio que el resto del
  proyecto, es chileno).
- Autor visible en cada entrada de bitácora (KPI relevo familiar >60%).
- Patrones de código espejo con el móvil para que compartir lógica sea
  barato (mismos nombres en `lib/`, `providers/`).

## Docs

- Roadmap de la entrega 10/10: `docs/ROADMAP.md`.
- Arquitectura de referencia y reglas sagradas: `ARCHITECTURE.md` y
  `CLAUDE.md` del backend.
