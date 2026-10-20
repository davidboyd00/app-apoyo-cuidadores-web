import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

import { ApiError } from "../lib/api";
import { supabase } from "../lib/supabase";

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(() => {
    // Errores transversales del backend: aplican a toda query y mutación.
    function onError(error: Error) {
      if (!(error instanceof ApiError)) return;
      if (error.status === 409) {
        // Gate de consentimiento (Ley 21.719). El backend también usa 409
        // para duplicados y "último admin", así que no redirigimos a ciegas:
        // revalidamos el consentimiento y ConsentGate manda a /consent solo
        // si de verdad falta.
        void queryClient.invalidateQueries({ queryKey: ["me", "consent"] });
      } else if (error.status === 401) {
        // Token inválido o expirado: limpiamos la caché (datos clínicos) y
        // cerramos sesión; ProtectedRoute redirige a /sign-in.
        queryClient.clear();
        void supabase.auth.signOut();
      }
    }

    const queryClient = new QueryClient({
      queryCache: new QueryCache({ onError }),
      mutationCache: new MutationCache({ onError }),
      defaultOptions: {
        queries: {
          // Datos clínicos cambian seguido; evitar caché agresiva.
          staleTime: 30_000,
          retry: 1,
        },
      },
    });
    return queryClient;
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
