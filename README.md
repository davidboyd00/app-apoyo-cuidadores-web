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

## Deploy (sitio estático)

El cliente es un SPA estático: `npm run build` genera `dist/` y cualquier
hosting de estáticos sirve (Render Static Site, Netlify, Vercel,
Cloudflare Pages…).

```bash
npm ci
npm run build        # tsc -b && vite build → dist/
npm run preview      # opcional: probar el build en http://localhost:4173
```

Configuración en el hosting:

- **Build command**: `npm ci && npm run build` · **Publish directory**: `dist`.
- **Variables `VITE_*`**: Vite las incrusta en el bundle **al compilar**,
  así que se definen en el entorno de build del hosting (no en runtime).
  Si cambias una, hay que volver a desplegar.
  - `VITE_API_URL` — URL pública del backend en Render, sin `/` final.
  - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — la key `anon`.
    **Nunca** la service role: todo lo `VITE_*` termina visible en el navegador.
  - `VITE_POLICY_VERSION` — igual a `POLICY_VERSION` del backend.
- **Fallback SPA**: usamos `BrowserRouter`, así que toda ruta desconocida
  debe servir `index.html` (si no, recargar `/patients/…` da 404).
  - Render Static Site: regla *Rewrite* `/*` → `/index.html`.
  - Netlify: archivo `public/_redirects` con `/*  /index.html  200`.
  - Vercel: `rewrites` de `/(.*)` a `/index.html` en `vercel.json`.

### CORS en el backend (Render)

El backend (`app/main.py`) arma `CORSMiddleware` con `CORS_ORIGINS`
(separados por coma, sin espacios). Si está vacío usa `"*"` y loguea un
WARNING: **no desplegar producción así**. En `render.yaml` la variable
es `sync: false`, así que se configura a mano en el dashboard de Render
(*Environment*) y requiere redeploy:

```
CORS_ORIGINS=https://<dominio-del-web>,http://localhost:5173
```

- El origen debe coincidir exacto: esquema + dominio + puerto, sin `/` final.
- Incluye cada dominio desde el que se abra el web (producción, previews
  si se usan) y `http://localhost:5173` si se prueba en local contra Render.
- Si falta, el navegador muestra un error de CORS y en Network las
  requests al backend fallan sin código HTTP; la app solo ve "Failed to fetch".

## Estructura

```
src/
  main.tsx           entry
  App.tsx            router + providers
  lib/
    supabase.ts      cliente Supabase (localStorage)
    api.ts           fetch wrapper con JWT
    api-types.ts     tipos generados desde openapi.json (no editar)
  hooks/
    use-api.ts       queries/mutaciones de TanStack Query
  providers/
    auth-provider.tsx
    query-provider.tsx   manejo transversal de 409/401
  routes/
    sign-in.tsx, sign-up.tsx, consent.tsx
    patients.tsx, patient-new.tsx, patient-detail.tsx, profile.tsx
  components/
    protected-route.tsx, consent-gate.tsx, app-header.tsx
    entry-form.tsx, members-panel.tsx, slow-hint.tsx
docs/
  ROADMAP.md         plan por días hasta la entrega
  QA.md              checklist de QA manual con dos usuarios
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
- QA manual con dos usuarios: `docs/QA.md`.
- Arquitectura de referencia y reglas sagradas: `ARCHITECTURE.md` y
  `CLAUDE.md` del backend.
