import { useState, type FormEvent } from "react";

import { useCreateEntry } from "../hooks/use-api";
import type { Schemas } from "../lib/api";

type Kind = Schemas["EntryCreate"]["kind"];

const KINDS: { value: Kind; label: string }[] = [
  { value: "nota", label: "Nota" },
  { value: "sintoma", label: "Síntoma" },
  { value: "animo", label: "Ánimo" },
  { value: "medicamento", label: "Medicamento" },
  { value: "alimentacion", label: "Alimentación" },
  { value: "ejercicio", label: "Ejercicio / movilidad" },
  { value: "otro", label: "Otro" },
];

export function EntryForm({ patientId }: { patientId: string }) {
  const crear = useCreateEntry(patientId);
  const [kind, setKind] = useState<Kind>("nota");
  const [content, setContent] = useState("");
  const [occurredAt, setOccurredAt] = useState(() => isoLocalNow());

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    await crear.mutateAsync({
      kind,
      content: content.trim(),
      occurred_at: new Date(occurredAt).toISOString(),
      source: "text",
    });
    setContent("");
    setOccurredAt(isoLocalNow());
  }

  return (
    <form onSubmit={onSubmit} style={styles.form}>
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
      {crear.isError && (
        <div style={styles.error}>
          {crear.error instanceof Error ? crear.error.message : "Error"}
        </div>
      )}
      <button
        type="submit"
        disabled={crear.isPending || !content.trim()}
        style={styles.primary}
      >
        {crear.isPending ? "Guardando…" : "Registrar"}
      </button>
    </form>
  );
}

function isoLocalNow(): string {
  // datetime-local necesita 'YYYY-MM-DDTHH:MM' sin segundos ni timezone.
  const d = new Date();
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
  primary: {
    padding: "10px 14px",
    borderRadius: 6,
    border: "none",
    background: "#0A84FF",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 600,
    alignSelf: "flex-start",
  },
  error: { color: "#c00", fontSize: 13 },
};
