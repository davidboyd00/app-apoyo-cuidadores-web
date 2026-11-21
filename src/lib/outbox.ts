import type { Schemas } from "./api";

// Cola offline (bitácora y dosis). Vive en este navegador: cada registro se guarda
// con un `client_id` (idempotencia en el backend) y su `registrado_en` (hora del
// dispositivo) para que el servidor lo acepte aunque llegue tarde.
//
// Nota de privacidad: el contenido clínico queda en localStorage del dispositivo
// mientras está pendiente. Se borra al sincronizar o al descartarlo.

type Base = {
  client_id: string;
  patient_id: string;
  registrado_en: string;
  // Error no recuperable que devolvió el servidor (p. ej. validación). Un
  // pendiente con error no se reintenta solo: lo ve el usuario y decide.
  error?: string;
};

// Entrada de bitácora. `tipo` falta en los pendientes guardados antes de que
// la cola aceptara dosis: se tratan como entradas.
export type PendienteEntrada = Base & {
  tipo?: "entrada";
  kind: Schemas["EntryCreate"]["kind"];
  content: string;
  occurred_at: string;
  source: "text" | "voice";
};

// Dosis de medicamento (la solicitud de cambio offline incluye fármacos).
export type PendienteDosis = Base & {
  tipo: "dosis";
  medication_id: string;
  medicamento: string; // solo para mostrarlo mientras está pendiente
  scheduled_for: string;
  taken_at: string | null;
  status: Schemas["MedicationDoseCreate"]["status"];
};

export type Pendiente = PendienteEntrada | PendienteDosis;

export function esDosis(p: Pendiente): p is PendienteDosis {
  return p.tipo === "dosis";
}

const CLAVE = "cuidadores:outbox:v1";
let cache: Pendiente[] | null = null;
const oyentes = new Set<() => void>();

function leer(): Pendiente[] {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(CLAVE);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    cache = Array.isArray(parsed) ? (parsed as Pendiente[]) : [];
  } catch {
    // Storage bloqueado o JSON corrupto: la cola queda vacía en memoria.
    cache = [];
  }
  return cache;
}

function escribir(lista: Pendiente[]) {
  cache = lista;
  try {
    localStorage.setItem(CLAVE, JSON.stringify(lista));
  } catch {
    // Sin storage (modo privado): la cola sigue viva en memoria mientras dure la pestaña.
  }
  oyentes.forEach((f) => f());
}

/** Snapshot estable (misma referencia mientras no cambie): apto para useSyncExternalStore. */
export function pendientes(): Pendiente[] {
  return leer();
}

export function suscribirOutbox(f: () => void): () => void {
  oyentes.add(f);
  return () => {
    oyentes.delete(f);
  };
}

export function encolar(p: Pendiente) {
  escribir([...leer().filter((x) => x.client_id !== p.client_id), p]);
}

export function quitar(clientId: string) {
  escribir(leer().filter((x) => x.client_id !== clientId));
}

export function marcarError(clientId: string, error: string) {
  escribir(leer().map((x) => (x.client_id === clientId ? { ...x, error } : x)));
}

// Otra pestaña del mismo origen cambió la cola: recargamos y avisamos.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key !== CLAVE) return;
    cache = null;
    oyentes.forEach((f) => f());
  });
}

/** Borra la cola de este navegador (al eliminar la cuenta: no dejar datos clínicos). */
export function vaciarOutbox() {
  escribir([]);
  try {
    localStorage.removeItem(CLAVE);
  } catch {
    // sin storage: ya quedó vacía en memoria
  }
}
