import { useEffect } from "react";

const BASE = "Cuidadores";

/** Título de la pestaña por pantalla ("Mi perfil · Cuidadores"). */
export function useTituloPagina(titulo?: string) {
  useEffect(() => {
    document.title = titulo ? `${titulo} · ${BASE}` : BASE;
  }, [titulo]);
}
