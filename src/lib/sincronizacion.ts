import { api, ApiError, type Schemas } from "./api";
import {
  encolar,
  esDosis,
  marcarError,
  pendientes,
  quitar,
  type Pendiente,
  type PendienteDosis,
  type PendienteEntrada,
} from "./outbox";
import { mensajeError } from "../utils/errores";

// Errores que no son culpa del registro: se conserva y se reintenta luego.
// - Sin red (fetch lanza TypeError).
// - 5xx y 429: el servidor está caído o dormido (Render free tarda ~30 s).
// - 401: sesión vencida; al volver a entrar el registro se envía.
// - 409: falta el consentimiento; se envía al aceptarlo.
export function esReintentable(err: unknown): boolean {
  if (err instanceof TypeError) return true;
  if (err instanceof ApiError) {
    return err.status >= 500 || [401, 409, 429].includes(err.status);
  }
  return false;
}

async function enviar(p: Pendiente) {
  if (esDosis(p)) {
    const dosis: Schemas["MedicationDoseCreate"] = {
      scheduled_for: p.scheduled_for,
      taken_at: p.taken_at,
      status: p.status,
      client_id: p.client_id,
      registrado_en: p.registrado_en,
    };
    return api.post<Schemas["MedicationDose"]>(
      `/patients/${p.patient_id}/medications/${p.medication_id}/doses`,
      dosis
    );
  }
  const cuerpo: Schemas["EntryCreate"] = {
    kind: p.kind,
    content: p.content,
    occurred_at: p.occurred_at,
    source: p.source,
    client_id: p.client_id,
    registrado_en: p.registrado_en,
  };
  return api.post<Schemas["Entry"]>(`/patients/${p.patient_id}/entries`, cuerpo);
}

/**
 * Intenta enviar un registro nuevo (entrada o dosis) ahora. Si no se pudo por causa reintentable
 * (sin red, servidor caído), lo deja en la cola local y devuelve "encolada".
 * Si el servidor lo rechaza por validación, no se guarda: el error sube al form.
 */
export async function registrar(p: Pendiente): Promise<"enviada" | "encolada"> {
  try {
    await enviar(p);
    return "enviada";
  } catch (err) {
    if (esReintentable(err)) {
      encolar(p);
      return "encolada";
    }
    throw err;
  }
}

export const registrarEntrada = (p: PendienteEntrada) => registrar(p);
export const registrarDosis = (p: PendienteDosis) => registrar(p);

let enCurso: Promise<void> | null = null;

/**
 * Envía la cola en orden (la más antigua primero). Se detiene en el primer
 * error reintentable para no martillar un servidor caído. `alTerminar` recibe
 * los pacientes que recibieron registros, para refrescar sus datos.
 */
export function sincronizar(alTerminar?: (pacientes: string[]) => void): Promise<void> {
  if (enCurso) return enCurso;
  enCurso = (async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    const enviados = new Set<string>();
    for (const p of pendientes()) {
      if (p.error) continue; // lo decide el usuario (descartar)
      try {
        await enviar(p);
        quitar(p.client_id);
        enviados.add(p.patient_id);
      } catch (err) {
        if (esReintentable(err)) break;
        marcarError(p.client_id, mensajeError(err, "El servidor rechazó este registro."));
      }
    }
    if (enviados.size > 0) alTerminar?.([...enviados]);
  })().finally(() => {
    enCurso = null;
  });
  return enCurso;
}
