import { useState } from "react";
import { Link, useParams } from "react-router-dom";

import { PatientLayout } from "../components/patient-layout";
import { SlowHint } from "../components/slow-hint";
import { useGenerarResumen, useResumenes } from "../hooks/use-api";
import type { Schemas } from "../lib/api";
import d from "../styles/patient-detail.module.css";
import s from "../styles/secciones.module.css";
import { fechaCompleta, tiempoRelativo } from "../utils/bitacora";
import { mensajeError } from "../utils/errores";

const PERIODOS = [7, 14, 30, 90];

export default function PatientResumenesPage() {
  return <PatientLayout seccion="Resúmenes">{() => <Resumenes />}</PatientLayout>;
}

function periodo(r: Schemas["Summary"]): string {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString("es-CL", { day: "numeric", month: "short" });
  return `${fmt(r.desde)} al ${fmt(r.hasta)}`;
}

function Resumenes() {
  const { id } = useParams();
  const resumenes = useResumenes(id);
  const generar = useGenerarResumen(id);
  const [dias, setDias] = useState(30);
  const [reutilizado, setReutilizado] = useState<Schemas["Summary"] | null>(null);

  function pedir(forzar = false) {
    setReutilizado(null);
    generar.mutate(
      { dias, forzar },
      {
        // Si ya hay uno listo del mismo período (últimas 24 h), el backend lo
        // devuelve sin llamar a la IA: lo avisamos y ofrecemos uno nuevo.
        onSuccess: (r) => {
          if (!forzar && r.estado === "listo") setReutilizado(r);
        },
      }
    );
  }

  const generando = resumenes.data?.some((r) => r.estado === "generando");

  return (
    <section className={`stack ${d.section}`} aria-labelledby="titulo-resumenes">
      <h2 id="titulo-resumenes">Resúmenes para la consulta médica</h2>
      <p className={`muted ${s.intro}`}>
        Un resumen breve de lo registrado, para llevar a la consulta. Lo redacta la IA solo con la
        bitácora e incluye una nota del sistema con las correcciones del período.
      </p>

      <div className="card stack">
        <div className="row-between">
          <label className="row">
            <span className="field-label">Período</span>
            <select className="input" value={dias} onChange={(e) => setDias(Number(e.target.value))}>
              {PERIODOS.map((p) => (
                <option key={p} value={p}>
                  Últimos {p} días
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => pedir(false)}
            disabled={generar.isPending || generando}
          >
            {generar.isPending || generando ? "Generando…" : "Generar resumen"}
          </button>
        </div>
        {generando && (
          <p className="muted small" aria-live="polite">
            Generando el resumen… puede tardar unos segundos. Puedes seguir usando la app.
          </p>
        )}
        {reutilizado && (
          <p className="alert alert-success" role="status">
            Ya había un resumen de este período de {tiempoRelativo(reutilizado.created_at)}.{" "}
            <Link to={`/patients/${id}/resumenes/${reutilizado.id}`}>Verlo</Link> o{" "}
            <button type="button" className="btn btn-ghost" onClick={() => pedir(true)}>
              generar uno nuevo
            </button>
          </p>
        )}
        {generar.isError && (
          <p className="alert" role="alert">
            {mensajeError(generar.error)}
          </p>
        )}
      </div>

      <div className="stack-sm">
        <h3>Resúmenes anteriores</h3>
        {resumenes.isLoading && <SlowHint />}
        {resumenes.error && (
          <p className="alert" role="alert">
            {mensajeError(resumenes.error)}
          </p>
        )}
        {resumenes.data?.length === 0 && <p className="muted">Todavía no hay resúmenes.</p>}
        <ul className={`list-reset ${s.lista}`}>
          {resumenes.data?.map((r) => (
            <li key={r.id} className={`card ${s.item}`}>
              <div className={s.itemPrincipal}>
                <p className={s.itemTitulo}>{periodo(r)}</p>
                <p className="muted small" title={fechaCompleta(r.created_at)}>
                  Pedido {tiempoRelativo(r.created_at)}
                </p>
              </div>
              {r.estado === "generando" && <span className="badge">Generando…</span>}
              {r.estado === "error" && (
                <>
                  <span className="badge badge-warning">No se pudo generar</span>
                  <button type="button" className="btn btn-ghost" onClick={() => pedir(true)}>
                    Reintentar
                  </button>
                </>
              )}
              {r.estado === "listo" && (
                <Link to={`/patients/${id}/resumenes/${r.id}`} className="btn">
                  Ver e imprimir
                </Link>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
