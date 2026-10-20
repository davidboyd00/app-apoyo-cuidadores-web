import { useEffect, useState } from "react";

/**
 * Aviso para el cold start de Render free (~30 s en la primera request).
 * Se renderiza mientras la query está en `isLoading`; si sigue montado
 * después de `ms`, muestra el mensaje. Al terminar la carga se desmonta.
 *
 *   {isLoading && <SlowHint />}
 */
export function SlowHint({ ms = 5000 }: { ms?: number }) {
  const [lento, setLento] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setLento(true), ms);
    return () => clearTimeout(t);
  }, [ms]);

  if (!lento) return null;
  return (
    <p className="slow-hint" role="status">
      El servidor está despertando, puede tardar hasta 30 s…
    </p>
  );
}
