import { useState, type FormEvent } from "react";

import { useCreateEntry } from "../hooks/use-api";
import type { Schemas } from "../lib/api";

type Kind = Schemas["EntryCreate"]["kind"];

export type EntryValues = Pick<Schemas["Entry"], "kind" | "content" | "occurred_at">;

const KINDS: { value: Kind; label: string }[] = [
  { value: "nota", label: "Nota" },
  { value: "sintoma", label: "Síntoma" },
  { value: "animo", label: "Ánimo" },
  { value: "medicamento", label: "Medicamento" },
  { value: "alimentacion", label: "Alimentación" },
  { value: "ejercicio", label: "Ejercicio / movilidad" },
  { value: "otro", label: "Otro" },
];

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
  const fechaInicial = initialValues
    ? isoLocal(new Date(initialValues.occurred_at))
    : isoLocal(new Date());

  const [kind, setKind] = useState<Kind>(initialValues?.kind ?? "nota");
  const [content, setContent] = useState(initialValues?.content ?? "");
  const [occurredAt, setOccurredAt] = useState(fechaInicial);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
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
    <form onSubmit={handleSubmit} style={styles.form}>
      <div style={styles.row}>
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as Kind)}
          style={styles.input}
        >
          {KINDS.map((k) => (
            <option key={k.value} value={k.value}>
              {k.label}
            </option>
          ))}
        </select>
        <input
          type="datetime-local"
          value={occurredAt}
          onChange={(e) => setOccurredAt(e.target.value)}
          style={styles.input}
        />
      </div>
      <textarea
        required
        placeholder="¿Qué pasó?"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        style={{ ...styles.input, minHeight: 80, resize: "vertical" }}
      />
      {error && <div style={styles.error}>{error}</div>}
      <div style={styles.actions}>
        <button
          type="submit"
          disabled={guardando || !content.trim()}
          style={styles.primary}
        >
          {guardando ? "Guardando…" : editando ? "Guardar cambios" : "Registrar"}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} style={styles.secondary}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}

function isoLocal(d: Date): string {
  // datetime-local necesita 'YYYY-MM-DDTHH:MM' sin segundos ni timezone.
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const styles: Record<string, React.CSSProperties> = {
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    padding: 16,
    borderRadius: 8,
    border: "1px solid #e5e5e5",
    background: "#fff",
  },
  row: { display: "flex", gap: 8, flexWrap: "wrap" },
  input: {
    padding: 10,
    fontSize: 14,
    borderRadius: 6,
    border: "1px solid #ccc",
    fontFamily: "inherit",
    flex: 1,
    minWidth: 160,
  },
  actions: { display: "flex", gap: 8 },
  primary: {
    padding: "10px 14px",
    borderRadius: 6,
    border: "none",
    background: "#0A84FF",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 600,
  },
  secondary: {
    padding: "10px 14px",
    borderRadius: 6,
    border: "1px solid #ccc",
    background: "#fff",
    cursor: "pointer",
  },
  error: { color: "#c00", fontSize: 13 },
};
