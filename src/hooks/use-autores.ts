import { useMemo } from "react";

import { useMembers } from "./use-api";
import { useAuth } from "../providers/auth-provider";

/** Mapa author_id → nombre visible. Base del KPI de relevo: quién escribió qué. */
export function useAutores(patientId: string | undefined) {
  const miembros = useMembers(patientId);
  const { session } = useAuth();
  const porId = useMemo(() => {
    const map: Record<string, string> = {};
    for (const m of miembros.data ?? []) map[m.user_id] = m.nombre || m.email;
    return map;
  }, [miembros.data]);

  // - "Tú" para las propias.
  // - Mientras cargan los miembros: sin etiqueta (placeholder), para no
  //   mostrar un "desconocido" que después cambia.
  // - Autor que ya no está en la red: fue removido o eliminó su cuenta.
  function autorDe(authorId: string) {
    const nombre = porId[authorId] ?? null;
    if (authorId === session?.user.id) return { nombre: nombre ?? "Tú", etiqueta: "Tú" };
    if (nombre) return { nombre, etiqueta: nombre };
    if (miembros.isLoading) return { nombre: null, etiqueta: null };
    if (miembros.error) return { nombre: null, etiqueta: "Autor no disponible" };
    return { nombre: null, etiqueta: "Ex integrante de la red" };
  }
  return { autorDe, cargando: miembros.isLoading, miembros };
}
