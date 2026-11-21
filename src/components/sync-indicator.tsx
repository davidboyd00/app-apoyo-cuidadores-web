import { useSincronizacion } from "../providers/sync-provider";
import s from "../styles/sync.module.css";

/**
 * Estado de la cola offline. No ocupa espacio si todo está sincronizado.
 * `role="status"` anuncia los cambios a lectores de pantalla sin robar foco.
 */
export function SyncIndicator() {
  const { pendientes, online, sincronizarAhora } = useSincronizacion();
  const conError = pendientes.filter((p) => p.error).length;
  const enEspera = pendientes.length - conError;

  if (!online) {
    return (
      <div role="status" className={`${s.bar} ${s.offline}`}>
        <span>Sin conexión.</span>
        <span>
          {pendientes.length > 0
            ? `${pendientes.length} ${pendientes.length === 1 ? "guardado aquí" : "guardados aquí"}; se enviarán al volver la red.`
            : "Puedes seguir registrando."}
        </span>
      </div>
    );
  }

  if (conError > 0) {
    return (
      <div role="status" className={`${s.bar} ${s.error}`}>
        <span>
          {conError === 1
            ? "1 registro no se pudo enviar."
            : `${conError} registros no se pudieron enviar.`}{" "}
          Revísalo abajo en la bitácora.
        </span>
      </div>
    );
  }

  if (enEspera > 0) {
    return (
      <div role="status" className={`${s.bar} ${s.pending}`}>
        <span>
          {enEspera === 1 ? "1 registro pendiente de sincronizar." : `${enEspera} registros pendientes de sincronizar.`}
        </span>
        <button type="button" className={`btn btn-ghost ${s.action}`} onClick={() => void sincronizarAhora()}>
          Sincronizar ahora
        </button>
      </div>
    );
  }

  return null;
}
