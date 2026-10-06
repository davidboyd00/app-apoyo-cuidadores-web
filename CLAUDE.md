# Cliente web de apoyo a cuidadores (Grupo 7 · GPTI PUC 2026-2)

Instrucciones específicas de este repo. Lee también el `CLAUDE.md` del
backend hermano en `../caregivers-backend/CLAUDE.md` (reglas sagradas) y el
roadmap en `docs/ROADMAP.md`.

## Qué es

Cliente web de la app de apoyo a cuidadores: bitácora compartida entre
familiares + gestión de la red de cuidado + perfiles. Consume el backend
FastAPI/Supabase. Responsable: David Boyd. Entrega parcial 10/10,
final 24/11/2026.

## Stack

- Vite + React 19 + TypeScript.
- Auth y realtime: Supabase (`@supabase/supabase-js` desde el cliente).
- Estado servidor: TanStack Query.
- Rutas: react-router-dom v7.
- Lint: oxlint.

## Reglas del proyecto

1. **Idioma**: código y comentarios en español.
2. **Todo llamado al backend usa el JWT de Supabase.** El helper de
   `src/lib/api.ts` lo inyecta automáticamente.
3. **Gate de consentimiento (Ley 21.719)**: si el backend responde 409
   en cualquier endpoint de negocio, redirigir a la pantalla de política.
4. **Autor visible en la bitácora**: cada entrada muestra quién la
   escribió. KPI de relevo familiar (>60% pacientes con ≥2 autores/semana).
5. **Patrones espejo con el móvil**: `src/lib/supabase.ts`,
   `src/lib/api.ts`, `src/providers/*` existen con los mismos nombres y
   la misma forma en los dos clientes. Facilita compartir conocimiento.
6. **Contrato con el backend congela en `app/schemas.py`**. Cambios a los
   tipos se coordinan con David.

## Contrato con el backend (tipos auto-generados)

El backend genera `openapi.json` desde su FastAPI app
(`scripts/generate_openapi.py`) y lo commitea al repo. Acá consumimos
ese archivo con `openapi-typescript` para producir `src/lib/api-types.ts`:

```bash
npm run types:api         # desde el main de GitHub (reproducible)
npm run types:api:local   # desde ../caregivers-backend/openapi.json (dev local)
```

Importar los tipos vía `src/lib/api.ts`:

```ts
import type { Schemas } from "@/lib/api";
type Patient = Schemas["Patient"];
```

Nunca edites `api-types.ts` a mano. Si falta un tipo, el fix es en el
backend (`app/schemas.py` + regenerar openapi.json + commit).

## Antes de declarar una tarea terminada

```bash
npm run lint        # oxlint
npx tsc -b          # typecheck
npm run build       # verifica que el bundle compila
```

## Variables de entorno

- `VITE_API_URL` — base URL del backend (local: http://localhost:8000).
- `VITE_SUPABASE_URL` — proyecto Supabase (compartido con backend y móvil).
- `VITE_SUPABASE_ANON_KEY` — key `anon` (pública), NUNCA la service role.
- `VITE_POLICY_VERSION` — versión vigente de la política de privacidad.

En Vite, solo variables con prefijo `VITE_` quedan expuestas al cliente.
No pongas aquí nada que no deba viajar al navegador.

## Fuera de alcance para la entrega 10/10

Priorizamos **bitácora de cuidados** y **gestión de perfiles**. Quedan
fuera (ya existen en el backend pero no se construye UI por ahora):
asistente IA, resúmenes médicos, notificaciones de medicamentos, ARCO
completo (export y delete account). El gate de consentimiento sí es
obligatorio por Ley 21.719.

## Repos hermanos

- Backend: https://github.com/davidboyd00/app-apoyo-cuidadores
- Móvil: https://github.com/davidboyd00/app-apoyo-cuidadores-movil-
