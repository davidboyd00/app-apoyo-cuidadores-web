import { useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useEffect, useSyncExternalStore, type ReactNode } from "react";

import { pendientes, suscribirOutbox, type Pendiente } from "../lib/outbox";
import { sincronizar } from "../lib/sincronizacion";

type EstadoSync = {
  pendientes: Pendiente[];
  online: boolean;
  sincronizarAhora: () => Promise<void>;
};

const SyncContext = createContext<EstadoSync | null>(null);

const INTERVALO_REINTENTO_MS = 30_000;

function suscribirConexion(f: () => void) {
  window.addEventListener("online", f);
  window.addEventListener("offline", f);
  return () => {
    window.removeEventListener("online", f);
    window.removeEventListener("offline", f);
  };
}

/**
 * Mantiene la cola offline sincronizada: envía al volver la red, al volver a
 * la pestaña y cada 30 s mientras haya pendientes. Al enviar, refresca los
 * datos de cada paciente afectado (bitácora y dosis).
 */
export function SyncProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const lista = useSyncExternalStore(suscribirOutbox, pendientes, pendientes);
  const online = useSyncExternalStore(
    suscribirConexion,
    () => navigator.onLine,
    () => true
  );

  const alTerminar = useCallback(
    (pacientes: string[]) => {
      for (const id of pacientes) {
        // Bitácora y medicamentos cuelgan de ["patients", id].
        void qc.invalidateQueries({ queryKey: ["patients", id] });
      }
    },
    [qc]
  );

  const sincronizarAhora = useCallback(() => sincronizar(alTerminar), [alTerminar]);

  useEffect(() => {
    void sincronizarAhora();
    const cuandoHayRed = () => void sincronizarAhora();
    const cuandoVisible = () => {
      if (document.visibilityState === "visible") void sincronizarAhora();
    };
    window.addEventListener("online", cuandoHayRed);
    document.addEventListener("visibilitychange", cuandoVisible);
    const timer = window.setInterval(() => {
      if (pendientes().length > 0) void sincronizarAhora();
    }, INTERVALO_REINTENTO_MS);
    return () => {
      window.removeEventListener("online", cuandoHayRed);
      document.removeEventListener("visibilitychange", cuandoVisible);
      window.clearInterval(timer);
    };
  }, [sincronizarAhora]);

  return (
    <SyncContext.Provider value={{ pendientes: lista, online, sincronizarAhora }}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSincronizacion(): EstadoSync {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error("useSincronizacion debe usarse dentro de SyncProvider");
  return ctx;
}
