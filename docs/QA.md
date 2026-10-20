# QA manual · Cliente web (dos usuarios)

Checklist para validar el flujo completo con **dos cuentas distintas**
antes de la entrega. Los códigos HTTP esperados salen del backend
(`caregivers-backend/app/routers/*`, `app/deps.py`, `app/errors.py`) y de
las políticas RLS de `db/schema.sql`.

## Preparación

- [ ] Backend corriendo (local o Render) con `CORS_ORIGINS` que incluya el
      origen del web (`http://localhost:5173` en dev).
- [ ] `log_entries` agregada a la publicación `supabase_realtime` (paso
      opcional, solo para el punto 7).
- [ ] Dos navegadores o una ventana normal + una de incógnito (cada una
      guarda su propia sesión en `localStorage`).
- [ ] DevTools abiertas en la pestaña **Network** para mirar los códigos.

| Usuario | Rol esperado | Correo de ejemplo |
|---|---|---|
| **A** | admin (crea el paciente) | `qa.a@ejemplo.cl` |
| **B** | caregiver (invitado) | `qa.b@ejemplo.cl` |

**Token para pruebas con curl** (pasos que la UI no permite hacer), en la
consola del navegador de cada usuario:

```js
JSON.parse(localStorage.getItem(Object.keys(localStorage).find((k) => k.startsWith("sb-") && k.endsWith("-auth-token")))).access_token
```

```bash
API=http://localhost:8000      # o la URL de Render
TOKEN_B=eyJ...                  # token del usuario B
```

---

## 1. Registro

| # | Acción | Esperado |
|---|---|---|
| 1.1 | A se registra en `/sign-up`. | Lo resuelve Supabase Auth (no pasa por el backend). Si el proyecto exige confirmar el correo, A debe confirmar antes de entrar. |
| 1.2 | B se registra en la otra ventana. | Igual que 1.1. |

## 2. Consentimiento (Ley 21.719)

| # | Acción | Esperado |
|---|---|---|
| 2.1 | A entra por primera vez. | `GET /me/consent` → **200** con `aceptada_en: null`. La app redirige a `/consent`. |
| 2.2 | (Opcional, curl) Sin aceptar, A llama `GET /patients`. | **409** "Debes aceptar la versión vigente de la política…". |
| 2.3 | A pulsa "Acepto la política". | `POST /me/consent` → **201**, `aceptada_en` con fecha. Redirige a `/`. |
| 2.4 | B repite 2.1 y 2.3. | Mismos códigos. |
| 2.5 | Recargar la página. | No vuelve a pedir el consentimiento. |

## 3. Crear paciente (A)

| # | Acción | Esperado |
|---|---|---|
| 3.1 | A crea "Doña Elba" en `/patients/new`. | `POST /patients` → **201**. Navega al detalle. |
| 3.2 | La sección "Red de cuidado" lista a A. | `GET /patients/{id}/members` → **200**, A con rol **Admin** (trigger `_patient_owner_admin`). |
| 3.3 | B pega en su navegador la URL del paciente de A. | `GET /patients/{id}` → **404** "Paciente no encontrado o sin acceso" (RLS aísla al paciente). |

## 4. Invitar al segundo usuario (A)

| # | Acción | Esperado |
|---|---|---|
| 4.1 | A invita un correo sin cuenta. | `POST /patients/{id}/members` → **404** "No existe una cuenta con el correo…". El mensaje se ve bajo el formulario. |
| 4.2 | A invita a B con rol "Cuidador/a". | **201**. B aparece en la lista con rol **Cuidador/a**. |
| 4.3 | A vuelve a invitar a B. | **201** (es un upsert: no hay duplicado, solo se actualiza el rol). |
| 4.4 | B recarga `/`. | `GET /patients` → **200**, B ve a "Doña Elba". En el switcher del header también aparece. |

## 5. Ambos crean entradas

| # | Acción | Esperado |
|---|---|---|
| 5.1 | A registra una nota. | `POST /patients/{id}/entries` → **201**. |
| 5.2 | B registra un síntoma. | **201**. |
| 5.3 | Filtrar por tipo en el feed. | `GET /patients/{id}/entries` → **200**; el filtro muestra solo ese tipo. |

## 6. Autor visible (KPI relevo familiar)

| # | Acción | Esperado |
|---|---|---|
| 6.1 | A y B miran el feed. | Cada entrada muestra el nombre (o correo) de su autor. Ninguna dice "autor desconocido". |
| 6.2 | B pone su nombre en `/me` y guarda. | `PUT /me/profile` → **200**, "Guardado". Tras refrescar el detalle, sus entradas muestran el nombre en vez del correo. |
| 6.3 | Botones Editar/Borrar. | Cada usuario ve los botones solo en **sus** entradas. |

## 7. Realtime (opcional, requiere la publicación)

| # | Acción | Esperado |
|---|---|---|
| 7.1 | Ambos en el detalle del paciente; B registra una entrada. | En la ventana de A la entrada aparece **sin recargar** (en Network se ve un nuevo `GET …/entries`). |

## 8. El no-admin intenta quitar a un miembro (debe fallar)

| # | Acción | Esperado |
|---|---|---|
| 8.1 | B pulsa "Quitar" sobre A. | `DELETE /patients/{id}/members/{uid_A}` → **404** "Miembro no encontrado o sin permisos." (la policy `care_members_write` exige admin; RLS borra 0 filas). El mensaje se ve bajo la lista y A sigue en ella. |
| 8.2 | B intenta invitar a alguien. | **403** "Solo un admin del grupo puede invitar miembros." |
| 8.3 | A intenta quitarse a sí mismo (es el único admin). | **409** "No se puede eliminar al único admin del grupo…". **No** debe redirigir a `/consent`: el 409 revalida el consentimiento, que sigue vigente. |

## 9. Editar / borrar entrada ajena (debe fallar)

La UI no muestra los botones en entradas ajenas, así que se prueba con
curl usando el token de **B** sobre una entrada de **A** (copiar su `id`
de la respuesta de `GET …/entries` en Network).

```bash
curl -i -X PATCH "$API/patients/$PACIENTE/entries/$ENTRADA_DE_A" \
  -H "Authorization: Bearer $TOKEN_B" -H "Content-Type: application/json" \
  -d '{"content":"editado por B"}'

curl -i -X DELETE "$API/patients/$PACIENTE/entries/$ENTRADA_DE_A" \
  -H "Authorization: Bearer $TOKEN_B"
```

| # | Acción | Esperado |
|---|---|---|
| 9.1 | B edita la entrada de A. | **404** "Entrada no encontrada o sin permisos para editarla". |
| 9.2 | B borra la entrada de A. | **404** "Entrada no encontrada o sin permisos para eliminarla". |
| 9.3 | B edita y borra **su propia** entrada desde la UI. | `PATCH` → **200**, `DELETE` → **204**. |
| 9.4 | A (admin) edita la entrada de B con curl. | **200**: por diseño, el admin del grupo puede corregir entradas ajenas (`entries_update`). |

## 10. Errores transversales

| # | Acción | Esperado |
|---|---|---|
| 10.1 | Con el backend dormido en Render, entrar a la app. | Tras 5 s aparece "El servidor está despertando, puede tardar hasta 30 s…". |
| 10.2 | Corromper el token en `localStorage` y recargar el detalle. | El backend responde **401** "Token inválido o expirado"; la app cierra sesión y vuelve a `/sign-in`. |
| 10.3 | Apagar el backend y crear una entrada. | Error visible bajo el formulario; la página no se rompe. |

---

**Registro de la corrida**: fecha, quién la ejecutó, URL del backend y
pasos que fallaron (con captura de Network).
