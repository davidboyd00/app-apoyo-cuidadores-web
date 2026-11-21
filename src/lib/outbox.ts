import type { Schemas } from "./api";

// Cola offline de la bitácora. Vive en este navegador: cada registro se guarda
// con un `client_id` (idempotencia en el backend) y su `registrado_en` (hora del
// dispositivo) para que el servidor lo acepte aunque llegue tarde.
//
// Nota de privacidad: el contenido clínico queda en localStorage del dispositivo
// mientras está pendiente. Se borra al sincronizar o al descartarlo.

export type Pendiente = {
  client_id: string;
  patient_id: string;
  kind: Schemas["EntryCreate"]["kind"];
  content: string;
  occurred_at: string;
  registrado_en: string;
  source: "text";
  // Error no recuperable que devolvió el servidor (p. ej. validación). Un
  // pendiente con error no se reintenta solo: lo ve el usuario y decide.
  error?: string;
};

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
