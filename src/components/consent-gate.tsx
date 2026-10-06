import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { useConsent } from "../hooks/use-api";

/**
 * Ley 21.719: bloquea el acceso a cualquier endpoint de negocio hasta que
 * el usuario acepte la versión vigente de la política. Si ya está en
 * `/consent`, deja pasar para que la pantalla pueda renderizar.
 */
export function ConsentGate({ children }: { children: ReactNode }) {
  const { data, isLoading, error } = useConsent();
  const location = useLocation();

  if (isLoading) return <div style={{ padding: 24 }}>Cargando política…</div>;

  if (error) {
    return (
      <div style={{ padding: 24, color: "#c00" }}>
        No pudimos verificar tu consentimiento. Reintenta en unos segundos.
      </div>
    );
  }

  const yaAceptada = data?.aceptada_en !== null && data?.aceptada_en !== undefined;
  const enConsent = location.pathname === "/consent";

  if (!yaAceptada && !enConsent) {
    return <Navigate to="/consent" replace />;
  }
  if (yaAceptada && enConsent) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
