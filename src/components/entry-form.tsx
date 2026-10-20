import { useId, useState, type FormEvent } from "react";

import { useCreateEntry } from "../hooks/use-api";
import type { Schemas } from "../lib/api";
import s from "../styles/patient-detail.module.css";
import { KINDS, type Kind } from "../utils/bitacora";
import { FormField } from "./form-field";

export type EntryValues = Pick<Schemas["Entry"], "kind" | "content" | "occurred_at">;

type Props = {
  patientId: string;
  // Modo edición: si vienen `initialValues` + `onSubmit`, el form no crea
  // una entrada nueva sino que entrega los valores al padre.
  initialValues?: EntryValues;
  onSubmit?: (valores: EntryValues) => Promise<unknown>;
  onCancel?: () => void;
};

export function EntryForm({ patientId, initialValues, onSubmit, onCancel }: Props) {
  const crear = useCreateEntry(patientId);
  const editando = initialValues !== undefined;
  const grupoKind = useId();
  // Fecha original de la entrada en formato datetime-local (solo al editar).
  const [fechaInicial] = useState(() =>
    initialValues ? isoLocal(new Date(initialValues.occurred_at)) : ""
  );

  const [kind, setKind] = useState<Kind>(initialValues?.kind ?? "nota");
  const [content, setContent] = useState(initialValues?.content ?? "");
  const [occurredAt, setOccurredAt] = useState(fechaInicial);
  // Al crear, la fecha es "ahora" por defecto y se toma al enviar (no al
  // abrir la página): si el form queda abierto una hora, no se registra
  // con la hora vieja. Al editar, el campo de fecha siempre está visible.
  const [fechaManual, setFechaManual] = useState(editando);
  const [guardando, setGuardando] = useState(false);
  const [errorContenido, setErrorContenido] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!content.trim()) {
      setErrorContenido("Escribe qué pasó antes de guardar.");
      return;
    }
    setErrorContenido(null);
    const valores: EntryValues = {
      kind,
      content: content.trim(),
      occurred_at: fechaParaEnviar(),
    };
    setGuardando(true);
    setError(null);
    try {
      if (onSubmit) {
        await onSubmit(valores);
      } else {
        await crear.mutateAsync({ ...valores, source: "text" });
        setContent("");
        setFechaManual(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setGuardando(false);
    }
  }

  function fechaParaEnviar(): string {
    if (!fechaManual) return new Date().toISOString();
    // datetime-local pierde los segundos: si no se tocó la fecha,
    // conservamos el valor original para no "editarla" sin querer.
    if (initialValues && occurredAt === fechaInicial) return initialValues.occurred_at;
    return new Date(occurredAt).toISOString();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="card stack"
      aria-label={editando ? "Editar entrada" : "Nueva entrada de bitácora"}
      noValidate
    >
      <fieldset className={s.kinds}>
        <legend className="field-label">Tipo</legend>
        <div className={s.chips}>
          {KINDS.map((k) => (
            <label key={k.value} className={s.chipOption} data-kind={k.value}>
              <input
                type="radio"
                name={grupoKind}
                value={k.value}
                checked={kind === k.value}
                onChange={() => setKind(k.value)}
              />
              <CheckIcon />
              {k.label}
            </label>
          ))}
        </div>
      </fieldset>

      <FormField label="¿Qué pasó?" error={errorContenido}>
        {(props) => (
          <textarea
            {...props}
            placeholder="Ej: Durmió bien, almorzó completo y salimos a caminar 15 min."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="input"
          />
        )}
      </FormField>

      {fechaManual && (
        <div className={s.fechaManual}>
          <FormField label="Fecha y hora">
            {(props) => (
              <input
                {...props}
                type="datetime-local"
                value={occurredAt}
                onChange={(e) => setOccurredAt(e.target.value)}
                className="input"
              />
            )}
          </FormField>
          {!editando && (
            <button type="button" onClick={() => setFechaManual(false)} className="btn btn-ghost">
              Usar la hora actual
            </button>
          )}
        </div>
      )}

      {/* Botón justo bajo el texto: en móvil queda visible con el teclado abierto. */}
      <div className={s.formActions}>
        <button type="submit" disabled={guardando} className="btn btn-primary">
          {guardando ? "Guardando…" : editando ? "Guardar cambios" : "Registrar"}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn btn-ghost">
            Cancelar
          </button>
        )}
        {!fechaManual && (
          <span className="muted small">
            Fecha: ahora ·{" "}
            <button
              type="button"
              onClick={() => {
                setOccurredAt(isoLocal(new Date()));
                setFechaManual(true);
              }}
              className={s.linkButton}
            >
              Cambiar fecha
            </button>
          </span>
        )}
      </div>

      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}

function CheckIcon() {
  return (
    <svg className={s.check} width="16" height="16" viewBox="0 0 20 20" aria-hidden="true">
      <path
        d="M4 10.5l4 4 8-9"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function isoLocal(d: Date): string {
  // datetime-local necesita 'YYYY-MM-DDTHH:MM' sin segundos ni timezone.
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
