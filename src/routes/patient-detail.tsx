import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { EntryForm } from "../components/entry-form";
import { useMembers, usePatient, usePatientEntries } from "../hooks/use-api";
import type { Schemas } from "../lib/api";

type Kind = Schemas["EntryCreate"]["kind"];

const KIND_LABELS: Record<Kind, string> = {
  nota: "Nota",
  sintoma: "Síntoma",
  animo: "Ánimo",
  medicamento: "Medicamento",
  alimentacion: "Alimentación",
  ejercicio: "Ejercicio",
  otro: "Otro",
};

export default function PatientDetailPage() {
  const { id } = useParams();
  const paciente = usePatient(id);
  const [filtroKind, setFiltroKind] = useState<Kind | "">("");
  const entradas = usePatientEntries(id, {
    kind: filtroKind || undefined,
  });
  const miembros = useMembers(id);

  // Mapa author_id → nombre|email para rotular la autoría de cada entrada.
  // Base del KPI de relevo familiar: hace visible quién escribió qué.
  const autorPorId = useMemo(() => {
    const map: Record<string, string> = {};
    for (const m of miembros.data ?? []) {
      map[m.user_id] = m.nombre || m.email;
    }
    return map;
  }, [miembros.data]);

  if (paciente.isLoading) return <div style={{ padding: 24 }}>Cargando…</div>;
  if (paciente.error || !paciente.data) {
    return (
      <div style={{ padding: 24, color: "#c00" }}>
        {paciente.error instanceof Error ? paciente.error.message : "Error"}
      </div>
    );
  }

  return (
    <main style={styles.wrap}>
      <nav style={styles.breadcrumb}>
        <Link to="/">← Pacientes</Link>
      </nav>
      <header>
        <h1 style={{ margin: 0 }}>{paciente.data.nombre}</h1>
        {paciente.data.fecha_nacimiento && (
          <p style={styles.muted}>
            Nacido {new Date(paciente.data.fecha_nacimiento).toLocaleDateString("es-CL")}
          </p>
        )}
        {paciente.data.notas && <p>{paciente.data.notas}</p>}
      </header>

      <section style={styles.section}>
        <h2>Registrar en la bitácora</h2>
        {id && <EntryForm patientId={id} />}
      </section>

      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={{ margin: 0 }}>Bitácora</h2>
          <select
            value={filtroKind}
            onChange={(e) => setFiltroKind(e.target.value as Kind | "")}
            style={styles.filter}
          >
            <option value="">Todos los tipos</option>
            {Object.entries(KIND_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>

        {entradas.isLoading && <p>Cargando bitácora…</p>}
        {entradas.data && entradas.data.length === 0 && (
          <p style={styles.muted}>Sin entradas todavía.</p>
        )}
        <ul style={styles.list}>
          {entradas.data?.map((e) => (
            <li key={e.id} style={styles.entry}>
              <div style={styles.entryHeader}>
                <span style={styles.kindBadge}>{KIND_LABELS[e.kind]}</span>
                <span style={styles.muted}>
                  {new Date(e.occurred_at).toLocaleString("es-CL")}
                </span>
                <span style={styles.author}>
                  {autorPorId[e.author_id] ?? "autor desconocido"}
                </span>
              </div>
              <p style={styles.entryContent}>{e.content}</p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: { maxWidth: 760, margin: "40px auto", padding: 24, fontFamily: "system-ui" },
  breadcrumb: { marginBottom: 12 },
  muted: { color: "#666", margin: 0 },
  section: { marginTop: 28 },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    gap: 12,
    flexWrap: "wrap",
  },
  filter: {
    padding: 8,
    fontSize: 14,
    borderRadius: 6,
    border: "1px solid #ccc",
    fontFamily: "inherit",
  },
  list: { listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 10 },
  entry: {
    padding: 14,
    borderRadius: 8,
    border: "1px solid #eee",
    background: "#fafafa",
  },
  entryHeader: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: 6,
    fontSize: 13,
  },
  kindBadge: {
    padding: "2px 8px",
    borderRadius: 12,
    background: "#0A84FF22",
    color: "#0A84FF",
    fontWeight: 600,
  },
  author: {
    marginLeft: "auto",
    color: "#333",
    fontWeight: 500,
  },
  entryContent: { margin: 0, whiteSpace: "pre-wrap" },
};
