import { iniciales } from "../utils/bitacora";

const TONOS = 5;

// Tono estable por persona (hash simple del id) para distinguir autores.
function tono(clave: string): number {
  let h = 0;
  for (let i = 0; i < clave.length; i++) h = (h * 31 + clave.charCodeAt(i)) | 0;
  return Math.abs(h) % TONOS;
}

/** Avatar circular con iniciales; decorativo (el nombre va al lado). */
export function Avatar({ nombre, clave }: { nombre: string; clave: string }) {
  return (
    <span className="avatar" data-tono={tono(clave)} aria-hidden="true">
      {iniciales(nombre)}
    </span>
  );
}
