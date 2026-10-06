import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";

import { useAuth } from "../providers/auth-provider";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();

  if (loading) {
    return <div style={{ padding: 24 }}>Cargando…</div>;
  }
  if (!session) {
    return <Navigate to="/sign-in" replace />;
  }
  return <>{children}</>;
}
