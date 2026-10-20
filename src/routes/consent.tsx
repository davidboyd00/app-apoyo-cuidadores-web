import { Link } from "react-router-dom";

import { useAcceptConsent, useConsent } from "../hooks/use-api";
import { useAuth } from "../providers/auth-provider";

export default function ConsentPage() {
  const { data, isLoading, error } = useConsent();
  const aceptar = useAcceptConsent();
  const { signOut } = useAuth();

  if (isLoading) {
    return (
      <main className="container page">
        <p className="muted">Cargando política…</p>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="container page stack">
        <h1>Error cargando la política</h1>
        <p className="alert" role="alert">
          {error instanceof Error ? error.message : "Desconocido"}
        </p>
      </main>
    );
  }

  return (
    <main className="container page stack">
      <h1>Política de privacidad</h1>
      <p className="muted">
        Versión vigente: <code>{data.version_vigente}</code>
      </p>

      <article className="card policy-doc">
        {/* El texto llega como markdown; en MVP lo mostramos plano con pre-wrap. */}
        <pre className="policy-text">{data.texto}</pre>
      </article>

      {aceptar.isError && (
        <p className="alert" role="alert">
          {aceptar.error instanceof Error ? aceptar.error.message : "Error"}
        </p>
      )}

      {data.aceptada_en ? (
        // Relectura desde el footer: ya aceptada, sin botones de aceptar.
        <div className="row-between">
          <p className="muted">
            Aceptaste esta versión el{" "}
            {new Date(data.aceptada_en).toLocaleDateString("es-CL")}.
          </p>
          <Link to="/" className="btn">
            Volver al inicio
          </Link>
        </div>
      ) : (
      <div className="row">
        <button onClick={() => signOut()} className="btn">
          No acepto, salir
        </button>
        <button
          onClick={() => aceptar.mutate(data.version_vigente)}
          disabled={aceptar.isPending}
          className="btn btn-primary"
        >
          {aceptar.isPending ? "Guardando…" : "Acepto la política"}
        </button>
      </div>
      )}
    </main>
  );
}

