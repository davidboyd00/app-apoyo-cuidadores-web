import type { ReactNode } from "react";
import { Navigate, useLocation, useSearchParams } from "react-router-dom";

import { useConsent } from "../hooks/use-api";
import { SlowHint } from "./slow-hint";

/**
 * Ley 21.719: bloquea el acceso a cualquier endpoint de negocio hasta que
 * el usuario acepte la versión vigente de la política. Si ya está en
 * `/consent`, deja pasar para que la pantalla pueda renderizar.
 */
export function ConsentGate({ children }: { children: ReactNode }) {
  const { data, isLoading, error } = useConsent();
  const location = useLocation();
  const [params] = useSearchParams();

  if (isLoading) {
    return (
      <main className="container page" aria-busy="true">
        <p className="muted">Cargando política…</p>
        <SlowHint />
      </main>
    );
  }

  if (error) {
    return (
      <main className="container page">
        <p className="alert" role="alert">
          No pudimos verificar tu consentimiento. Reintenta en unos segundos.
        </p>
      </main>
    );
  }

  const yaAceptada = data?.aceptada_en !== null && data?.aceptada_en !== undefined;
  const enConsent = location.pathname === "/consent";
  // `/consent?ver=1` (link del footer) permite releer la política ya aceptada.
  const releyendo = params.get("ver") === "1";

  if (!yaAceptada && !enConsent) {
    return <Navigate to="/consent" replace />;
  }
  if (yaAceptada && enConsent && !releyendo) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
