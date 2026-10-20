import type { Schemas } from "../lib/api";

export type Kind = Schemas["EntryCreate"]["kind"];

// Orden y etiquetas de los tipos de entrada (los mismos que acepta el backend).
export const KINDS: { value: Kind; label: string }[] = [
  { value: "nota", label: "Nota" },
  { value: "sintoma", label: "Síntoma" },
  { value: "animo", label: "Ánimo" },
  { value: "medicamento", label: "Medicamento" },
  { value: "alimentacion", label: "Alimentación" },
  { value: "ejercicio", label: "Ejercicio" },
  { value: "otro", label: "Otro" },
];

export const KIND_LABELS = Object.fromEntries(KINDS.map((k) => [k.value, k.label])) as Record<
  Kind,
  string
>;

/** Edad en años desde "YYYY-MM-DD" (sin pasar por UTC para no correr el día). */
export function edad(fechaNacimiento: string | null | undefined): number | null {
  if (!fechaNacimiento) return null;
  const [a, m, d] = fechaNacimiento.split("-").map(Number);
  if (!a || !m || !d) return null;
  const hoy = new Date();
  let anios = hoy.getFullYear() - a;
  if (hoy.getMonth() + 1 < m || (hoy.getMonth() + 1 === m && hoy.getDate() < d)) anios--;
  return anios >= 0 ? anios : null;
}

const relativo = new Intl.RelativeTimeFormat("es-CL", { numeric: "auto" });

/** "hace 2 h", "ayer"…; desde 7 días atrás, fecha completa en es-CL. */
export function tiempoRelativo(iso: string, ahora = Date.now()): string {
  const fecha = new Date(iso);
  const seg = Math.round((fecha.getTime() - ahora) / 1000);
  const abs = Math.abs(seg);
  if (abs < 60) return "recién";
  if (abs < 3600) return relativo.format(Math.round(seg / 60), "minute");
  if (abs < 86400) return relativo.format(Math.round(seg / 3600), "hour");
  if (abs < 7 * 86400) return relativo.format(Math.round(seg / 86400), "day");
  return fechaCompleta(iso);
}

export function fechaCompleta(iso: string): string {
  return new Date(iso).toLocaleString("es-CL", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Iniciales para el avatar: "María Paz Soto" → "MS"; email → primera letra. */
export function iniciales(nombre: string): string {
  const base = nombre.includes("@") ? nombre.split("@")[0] : nombre;
  const partes = base.trim().split(/[\s._-]+/).filter(Boolean);
  if (partes.length === 0) return "?";
  const primera = partes[0][0];
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return (primera + ultima).toUpperCase();
}
