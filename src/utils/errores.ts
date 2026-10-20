import { ApiError } from "../lib/api";

const SIN_CONEXION =
  "No pudimos conectar con el servidor. Revisa tu conexión e intenta de nuevo.";

/**
 * Mensaje en español para mostrar al usuario a partir de cualquier error.
 * - ApiError con `detail` del backend: ese texto (ya viene en español).
 * - ApiError 5xx sin `detail` (p. ej. página HTML de Render): genérico.
 * - Error de red de fetch (TypeError "Failed to fetch"): sin conexión.
 */
export function mensajeError(
  err: unknown,
  fallback = "Ocurrió un error inesperado. Intenta de nuevo."
): string {
  if (err instanceof ApiError) {
    const conDetail =
      typeof err.detail === "object" && err.detail !== null && "detail" in err.detail;
    if (conDetail) return err.message;
    if (err.status >= 500) {
      return `El servidor tuvo un problema (HTTP ${err.status}). Intenta en unos minutos.`;
    }
    return fallback;
  }
  if (err instanceof TypeError || (err instanceof Error && /failed to fetch|network|load failed/i.test(err.message))) {
    return SIN_CONEXION;
  }
  return fallback;
}
