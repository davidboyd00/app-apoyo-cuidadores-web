import { iniciales } from "../utils/bitacora";

const TONOS = 5;

// Tono estable por persona (hash simple del id) para distinguir autores.
function tono(clave: string): number {
  let h = 0;
  for (let i = 0; i < clave.length; i++) h = (h * 31 + clave.charCodeAt(i)) | 0;
  return Math.abs(h) % TONOS;
}

/**
 * Avatar circular con iniciales; decorativo (el nombre va al lado).
 * `desconocido`: autor que ya no está en la red → avatar neutro con "?".
 */
export function Avatar({
  nombre,
  clave,
  desconocido = false,
}: {
  nombre: string;
  clave: string;
  desconocido?: boolean;
}) {
  return (
    <span
      className="avatar"
      data-tono={desconocido ? "neutro" : tono(clave)}
      aria-hidden="true"
    >
      {desconocido ? "?" : iniciales(nombre)}
    </span>
  );
}
