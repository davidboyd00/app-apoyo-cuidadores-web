import type { Kind } from "./bitacora";

// Extracción simple de datos del dictado (EDT 3.2.2): sugiere el tipo de
// registro por palabras clave. Corre en el navegador, sin enviar nada a un
// servidor, y es determinista. La persona siempre puede cambiar el tipo.
const PISTAS: { kind: Kind; patrones: RegExp[] }[] = [
  {
    kind: "sintoma",
    patrones: [
      /dolor/, /mare[oa]/, /fiebre/, /\btos\b/, /vomit/, /nause/, /diarrea/, /se cay/,
      /caida/, /temperatura/, /presion (alta|baja)/, /ahog/, /hinchad/, /sangr/,
    ],
  },
  {
    kind: "medicamento",
    patrones: [
      /pastilla/, /remedio/, /medicament/, /dosis/, /inyecci/, /insulina/, /comprimido/,
      /jarabe/, /gotas/, /\d+\s?mg\b/, /\bmg\b/, /tomo su/, /se tomo/,
    ],
  },
  {
    kind: "alimentacion",
    patrones: [/comi[oó]/, /almorz/, /almuerzo/, /desayun/, /\bonce\b/, /\bcena/, /comida/, /apetito/, /hidrat/, /\bagua\b/],
  },
  {
    kind: "animo",
    patrones: [/animo/, /triste/, /content[oa]/, /angusti/, /ansios/, /tranquil/, /irritab/, /llor/, /alegre/, /confundid/, /enojad/],
  },
  {
    kind: "ejercicio",
    patrones: [/camin/, /ejercicio/, /kinesi/, /paseo/, /estiramient/, /\bbici/],
  },
];

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/** Tipo más probable según las palabras del texto, o null si no hay pistas. */
export function sugerirTipo(texto: string): Kind | null {
  const t = normalizar(texto);
  let mejor: { kind: Kind; puntos: number } | null = null;
  for (const { kind, patrones } of PISTAS) {
    const puntos = patrones.filter((p) => p.test(t)).length;
    // En empate gana el primero de la lista (síntomas antes que el resto).
    if (puntos > 0 && (!mejor || puntos > mejor.puntos)) mejor = { kind, puntos };
  }
  return mejor?.kind ?? null;
}
