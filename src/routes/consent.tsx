import { useState } from "react";
import { Link } from "react-router-dom";

import { AuthLayout } from "../components/auth-layout";
import { useAcceptConsent, useConsent } from "../hooks/use-api";
import { useTituloPagina } from "../hooks/use-titulo-pagina";
import { useAuth } from "../providers/auth-provider";
import s from "../styles/auth.module.css";

export default function ConsentPage() {
  useTituloPagina("Política de privacidad");
  const { data, isLoading, error } = useConsent();
  const aceptar = useAcceptConsent();
  const { signOut } = useAuth();
  const [leida, setLeida] = useState(false);

  if (isLoading) {
    return (
      <AuthLayout title="Política de privacidad" wide>
        <div className={`skeleton ${s.skeletonPolicy}`} aria-busy="true" />
      </AuthLayout>
    );
  }

  if (error || !data) {
    return (
      <AuthLayout title="No pudimos cargar la política" wide>
        <p className="alert" role="alert">
          {error instanceof Error ? error.message : "Error desconocido"}
        </p>
      </AuthLayout>
    );
  }

  const fechaAceptada = data.aceptada_en
    ? new Date(data.aceptada_en).toLocaleDateString("es-CL", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <AuthLayout
      title="Política de privacidad"
      subtitle={
        <>
          Cuidamos los datos de salud según la Ley 21.719. Versión{" "}
          {data.version_vigente}.
        </>
      }
      wide
    >
      <article
        className="card policy-doc"
        tabIndex={0}
        aria-label="Texto de la política de privacidad"
      >
        {/* El texto llega como markdown; lo mostramos plano con pre-wrap. */}
        <pre className="policy-text">{data.texto}</pre>
      </article>

      {fechaAceptada ? (
        // Relectura desde el footer: ya aceptada, sin botones de aceptar.
        <div className="row-between">
          <p className="badge">Aceptada el {fechaAceptada}</p>
          <Link to="/" className="btn">
            Volver al inicio
          </Link>
        </div>
      ) : (
        <div className="stack">
          <label className={s.checkbox}>
            <input
              type="checkbox"
              checked={leida}
              onChange={(e) => setLeida(e.target.checked)}
            />
            He leído y acepto la política de privacidad
          </label>

          {aceptar.isError && (
            <p className="alert" role="alert">
              {aceptar.error instanceof Error ? aceptar.error.message : "Error"}
            </p>
          )}

          <div className={s.actions}>
            <button onClick={() => signOut()} className="btn btn-ghost">
              No acepto, salir
            </button>
            <button
              onClick={() => aceptar.mutate(data.version_vigente)}
              disabled={!leida || aceptar.isPending}
              className="btn btn-primary"
            >
              {aceptar.isPending ? "Guardando…" : "Continuar"}
            </button>
          </div>
        </div>
      )}
    </AuthLayout>
  );
}
