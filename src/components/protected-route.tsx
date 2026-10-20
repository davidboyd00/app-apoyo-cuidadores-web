import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";

import { useAuth } from "../providers/auth-provider";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <main className="container page" aria-busy="true">
        <p className="muted">Cargando…</p>
      </main>
    );
  }
  if (!session) {
    return <Navigate to="/sign-in" replace />;
  }
  return <>{children}</>;
}
