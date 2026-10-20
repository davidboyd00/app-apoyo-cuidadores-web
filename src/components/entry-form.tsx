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
  const fechaInicial = initialValues
    ? isoLocal(new Date(initialValues.occurred_at))
    : isoLocal(new Date());

  const [kind, setKind] = useState<Kind>(initialValues?.kind ?? "nota");
  const [content, setContent] = useState(initialValues?.content ?? "");
  const [occurredAt, setOccurredAt] = useState(fechaInicial);
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
      // datetime-local pierde los segundos: si no se tocó la fecha,
      // conservamos el valor original para no "editarla" sin querer.
      occurred_at:
        initialValues && occurredAt === fechaInicial
          ? initialValues.occurred_at
          : new Date(occurredAt).toISOString(),
    };
    setGuardando(true);
    setError(null);
    try {
      if (onSubmit) {
        await onSubmit(valores);
      } else {
        await crear.mutateAsync({ ...valores, source: "text" });
        setContent("");
        setOccurredAt(isoLocal(new Date()));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setGuardando(false);
    }
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

      <div className={s.formFooter}>
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
        <div className="row">
          {onCancel && (
            <button type="button" onClick={onCancel} className="btn btn-ghost">
              Cancelar
            </button>
          )}
          <button type="submit" disabled={guardando} className="btn btn-primary">
            {guardando ? "Guardando…" : editando ? "Guardar cambios" : "Registrar"}
          </button>
        </div>
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
