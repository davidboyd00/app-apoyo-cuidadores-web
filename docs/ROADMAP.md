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

- [ ] Gate de consentimiento (`GET /me/consent` → bloquear hasta POST).
- [ ] Lista de pacientes (`GET /patients`).
- [ ] Alta de paciente (`POST /patients`).
- [ ] Switcher de paciente en el header.
- [ ] Bitácora: feed cronológico (`GET /entries`) con filtro por `kind`.

## Día 3 — 8/10

- [ ] Bitácora: crear entrada (`POST /entries`), editar/borrar propia
      (RLS enforcea).
- [ ] Red de cuidado por paciente: listar miembros
      (`GET /patients/{id}/members`), invitar por email
      (`POST /patients/{id}/members`), remover
      (`DELETE /patients/{id}/members/{uid}`) solo si soy admin.
- [ ] Perfil propio (`GET /me/profile` + `PUT /me/profile`).

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

## Riesgos y mitigación

- **Backend en Render duerme** → la primera request tarda ~30s. Loading
  state tolerante + opcionalmente llamar a Supabase directo para lecturas
  que no necesitan la API.
- **Políticas RLS filtran de más** → testear con dos usuarios distintos
  durante el día 4. Los tests del backend ya cubren el aislamiento.
- **Deadline agresivo** → si algo se cae, el orden de sacrificio es
  Día 4 QA (reducir alcance) → Día 3 red de cuidado → Día 3 perfiles.
  La bitácora es intocable (es el core de la entrega).
