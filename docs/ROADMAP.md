# Roadmap · Cliente web

**Entrega parcial: 10/10/2026 (4 días desde el 6/10)**
**Entrega final: 24/11/2026**

Alcance acordado con el grupo tras feedback del ayudante: priorizar
**bitácora de cuidados** y **gestión de perfiles** en los dos frontends
(web + móvil). Fuera de este sprint: asistente IA, resúmenes,
notificaciones de medicamentos, ARCO export/delete.

---

## Día 1 — 6/10 (hoy)

- [x] Backend adaptado: `profiles`, `members`, bitácora completa (`alimentacion`,
      `ejercicio`), RPCs e invariantes. CORS documentado.
- [x] Scaffold Vite + React + TS.
- [x] Auth: `src/lib/supabase.ts`, `src/lib/api.ts`, `AuthProvider`,
      `QueryProvider`, pantallas de sign-in/sign-up, zona protegida con
      react-router.

## Día 2 — 7/10

- [x] Gate de consentimiento (`GET /me/consent` → bloquear hasta POST).
- [x] Lista de pacientes (`GET /patients`).
- [x] Alta de paciente (`POST /patients`).
- [x] Switcher de paciente en el header.
- [x] Bitácora: feed cronológico (`GET /entries`) con filtro por `kind`.

## Día 3 — 8/10

- [x] Bitácora: crear entrada (`POST /entries`), editar/borrar propia
      (RLS enforcea).
- [x] Red de cuidado por paciente: listar miembros
      (`GET /patients/{id}/members`), invitar por email
      (`POST /patients/{id}/members`), remover
      (`DELETE /patients/{id}/members/{uid}`) solo si soy admin.
- [x] Perfil propio (`GET /me/profile` + `PUT /me/profile`).

## Día 4 — 9/10

- [ ] QA cruzado web + móvil + backend.
- [ ] Fix de errores.
- [ ] Captura de pantallas y video corto (demo del flow completo).
- [ ] CORS en Render con el dominio productivo si vamos a desplegar.
- [ ] Pull de ambos repos listo para entregar.

---

## Fuera de alcance (v2)

- Asistente IA con citaciones.
- Resúmenes médicos.
- Notificaciones de medicamentos (meds doses está en el backend).
- ARCO completo (export + delete). Solo gate de consentimiento.
- Realtime en la bitácora (si da tiempo el día 4, se agrega).
- Mapa de centros/farmacias.

## Deuda técnica bitácora

Hallazgos de baja severidad de la revisión del 19/10, postergados:

- [ ] **Doble refetch al crear una entrada propia**: la mutación y el
      evento realtime invalidan `entries` por separado (no duplica
      entradas, solo requests de más).
- [ ] **Borrados simultáneos**: `borrar.variables` solo recuerda el
      último; al borrar dos entradas seguidas el primer botón se
      rehabilita antes de terminar. Usar un `Set` de ids en curso.
- [ ] **Edición reenvía `content`** si el original tenía espacios al
      inicio/fin (el form recorta). Comparar recortado contra recortado.
- [ ] **Hora relativa estática**: "hace 2 min" no se actualiza con la
      página abierta, y un `occurred_at` futuro muestra "dentro de 2
      horas". Re-render cada 60 s y fecha completa para el futuro.
- [ ] **Borrador perdido en 401/409**: si la sesión expira o falta el
      consentimiento mientras se escribe, se pierde el texto. Guardarlo
      en `sessionStorage` por paciente.

## Riesgos y mitigación

- **Backend en Render duerme** → la primera request tarda ~30s. Loading
  state tolerante + opcionalmente llamar a Supabase directo para lecturas
  que no necesitan la API.
- **Políticas RLS filtran de más** → testear con dos usuarios distintos
  durante el día 4. Los tests del backend ya cubren el aislamiento.
- **Deadline agresivo** → si algo se cae, el orden de sacrificio es
  Día 4 QA (reducir alcance) → Día 3 red de cuidado → Día 3 perfiles.
  La bitácora es intocable (es el core de la entrega).
