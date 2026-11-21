import { useState } from "react";
import { Link, useParams } from "react-router-dom";

import { AppShell } from "../components/app-shell";
import { SlowHint } from "../components/slow-hint";
import { usePatient, useResumen } from "../hooks/use-api";
import { useTituloPagina } from "../hooks/use-titulo-pagina";
import s from "../styles/secciones.module.css";
import { edad, fechaCompleta } from "../utils/bitacora";
import { mensajeError } from "../utils/errores";

/**
 * Resumen médico listo para la consulta (EDT 3.2.1, "exportable"): se imprime
 * o se guarda como PDF desde el navegador, sin servicios extra ($0).
 * La parte de la IA y la nota de trazabilidad (del sistema) se muestran
 * separadas para que el profesional sepa qué escribió cada uno.
 */
export default function ResumenImprimirPage() {
  const { id, sid } = useParams();
  const paciente = usePatient(id);
  const resumen = useResumen(id, sid);
  const [copiado, setCopiado] = useState(false);
  useTituloPagina(paciente.data ? `Resumen · ${paciente.data.nombre}` : "Resumen");

  const contenido = resumen.data?.contenido ?? "";
  const corte = contenido.indexOf("\n---\n");
  const textoIA = corte >= 0 ? contenido.slice(0, corte) : contenido;
  const nota = corte >= 0 ? contenido.slice(corte + 5) : "";

  async function copiar() {
    try {
      await navigator.clipboard.writeText(contenido);
      setCopiado(true);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <AppShell>
      <nav className={`row-between ${s.noImprimir}`}>
        <Link to={`/patients/${id}/resumenes`}>← Resúmenes</Link>
        {resumen.data?.estado === "listo" && (
          <div className="row">
            <button type="button" className="btn" onClick={copiar}>
              {copiado ? "Copiado ✓" : "Copiar texto"}
            </button>
            <button type="button" className="btn btn-primary" onClick={() => window.print()}>
              Imprimir o guardar PDF
            </button>
          </div>
        )}
      </nav>

      {(resumen.isLoading || paciente.isLoading) && <SlowHint />}
      {resumen.error && (
        <p className="alert" role="alert">
          {mensajeError(resumen.error)}
        </p>
      )}
      {resumen.data?.estado === "generando" && (
        <p className="card muted" aria-live="polite">
          Generando el resumen… esta página se actualiza sola.
        </p>
      )}
      {resumen.data?.estado === "error" && (
        <p className="alert" role="alert">
          No se pudo generar este resumen. Vuelve a Resúmenes y pide uno nuevo.
        </p>
      )}

      {resumen.data?.estado === "listo" && paciente.data && (
        <article className={`card stack ${s.documento}`}>
          <header className={s.documentoCabecera}>
            <div>
              <h1>Resumen de cuidado</h1>
              <p>
                <strong>{paciente.data.nombre}</strong>
                {edad(paciente.data.fecha_nacimiento) !== null &&
                  ` · ${edad(paciente.data.fecha_nacimiento)} años`}
              </p>
            </div>
            <div className="small">
              <p>
                Período: {fechaCompleta(resumen.data.desde)} al {fechaCompleta(resumen.data.hasta)}
              </p>
              <p>Generado: {fechaCompleta(resumen.data.created_at)}</p>
            </div>
          </header>
          <section aria-label="Resumen">
            <p className={s.resumenTexto}>{textoIA}</p>
          </section>
          {nota && (
            <section aria-label="Trazabilidad del registro" className={s.nota}>
              {nota}
            </section>
          )}
          <footer className="small muted">
            Redactado con IA a partir de lo que la familia registró en la bitácora. No reemplaza la
            evaluación de un profesional de salud.
          </footer>
        </article>
      )}
    </AppShell>
  );
}
