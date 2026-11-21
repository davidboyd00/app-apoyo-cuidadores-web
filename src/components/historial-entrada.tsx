import { KindChip } from "./kind-chip";
import { useHistorialEntrada } from "../hooks/use-api";
import s from "../styles/patient-detail.module.css";
import { fechaCompleta } from "../utils/bitacora";
import { mensajeError } from "../utils/errores";

type Props = {
  patientId: string;
  entryId: string;
  autorDe: (authorId: string) => { etiqueta: string | null };
};

/**
 * Historial inmutable de una entrada: la versión original tal como se
 * escribió y cada corrección o borrado, con quién, cuándo y por qué. Es lo
 * que promete la nota de trazabilidad de los resúmenes médicos.
 */
export function HistorialEntrada({ patientId, entryId, autorDe }: Props) {
  const historial = useHistorialEntrada(patientId, entryId, true);

  if (historial.isLoading) {
    return <p className="muted small">Cargando historial…</p>;
  }
  if (historial.error || !historial.data) {
    return (
      <p className="field-error" role="alert">
        {mensajeError(historial.error, "No se pudo cargar el historial.")}
      </p>
    );
  }

  const { original, revisiones } = historial.data;
  const quien = (id: string) => autorDe(id).etiqueta ?? "Un miembro del grupo";

  return (
    <ol className={`list-reset ${s.historial}`} aria-label="Historial de cambios">
      <li className={s.historialPaso}>
        <p className="small">
          <strong>Versión original</strong> · {quien(original.author_id)} ·{" "}
          {fechaCompleta(original.created_at)}
        </p>
        <div className={s.historialVersion}>
          <KindChip kind={original.kind} />
          <span className="small muted">Ocurrió: {fechaCompleta(original.occurred_at)}</span>
        </div>
        <p className={s.historialTexto}>{original.content}</p>
      </li>
      {revisiones.map((r) => (
        <li key={r.id} className={s.historialPaso}>
          <p className="small">
            <strong>{r.accion === "anular" ? "Borrada" : "Corregida"}</strong> por{" "}
            {quien(r.author_id)} · {fechaCompleta(r.created_at)}
          </p>
          <p className="small">
            <span className="muted">Motivo:</span> {r.motivo}
          </p>
          {r.accion === "editar" && r.content && (
            <>
              <div className={s.historialVersion}>
                {r.kind && <KindChip kind={r.kind} />}
                {r.occurred_at && (
                  <span className="small muted">Ocurrió: {fechaCompleta(r.occurred_at)}</span>
                )}
              </div>
              <p className={s.historialTexto}>{r.content}</p>
            </>
          )}
        </li>
      ))}
    </ol>
  );
}
