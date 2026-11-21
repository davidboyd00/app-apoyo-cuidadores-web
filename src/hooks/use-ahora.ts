import { useEffect, useState } from "react";

/** Hora actual que se renueva cada `intervaloMs` (para "hace 5 min"). */
export function useAhora(intervaloMs = 60_000): number {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setAhora(Date.now()), intervaloMs);
    return () => window.clearInterval(t);
  }, [intervaloMs]);
  return ahora;
}
