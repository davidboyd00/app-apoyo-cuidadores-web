import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { AppHeader } from "../components/app-header";
import { EntryForm, type EntryValues } from "../components/entry-form";
import { MembersPanel } from "../components/members-panel";
import { SlowHint } from "../components/slow-hint";
import {
  useDeleteEntry,
  useMembers,
  usePatient,
  usePatientEntries,
  useUpdateEntry,
} from "../hooks/use-api";
import type { Schemas } from "../lib/api";
import { supabase } from "../lib/supabase";
import { useAuth } from "../providers/auth-provider";

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

// supabase-js reutiliza un canal con el mismo nombre y removeChannel es
// async: con StrictMode (montar → desmontar → montar) el segundo `.on()`
// caería sobre el canal ya suscrito y lanzaría. Un sufijo por suscripción
// lo evita.
let contadorCanales = 0;

export default function PatientDetailPage() {
  const { id } = useParams();
  const paciente = usePatient(id);
  const [filtroKind, setFiltroKind] = useState<Kind | "">("");
  const entradas = usePatientEntries(id, {
    kind: filtroKind || undefined,
  });
  const miembros = useMembers(id);
  const { session } = useAuth();
  const actualizar = useUpdateEntry(id);
  const borrar = useDeleteEntry(id);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [errorPorEntrada, setErrorPorEntrada] = useState<Record<string, string>>({});
  const qc = useQueryClient();

  // Realtime: cuando otro familiar registra una entrada, refrescamos el feed.
  // RLS (entries_select) también filtra los eventos que llegan por Realtime.
  useEffect(() => {
    if (!id) return;
    const canal = supabase
      .channel(`bitacora:${id}:${++contadorCanales}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "log_entries",
          filter: `patient_id=eq.${id}`,
        },
        () => {
          void qc.invalidateQueries({ queryKey: ["patients", id, "entries"] });
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(canal);
    };
  }, [id, qc]);

  // Mapa author_id → nombre|email para rotular la autoría de cada entrada.
  // Base del KPI de relevo familiar: hace visible quién escribió qué.
  const autorPorId = useMemo(() => {
    const map: Record<string, string> = {};
    for (const m of miembros.data ?? []) {
      map[m.user_id] = m.nombre || m.email;
    }
    return map;
  }, [miembros.data]);

  // Solo se envían los campos que cambiaron; si no cambió nada, se cierra.
  async function guardarEdicion(entrada: Schemas["Entry"], valores: EntryValues) {
    const cambios: Schemas["EntryUpdate"] = {};
    if (valores.kind !== entrada.kind) cambios.kind = valores.kind;
    if (valores.content !== entrada.content) cambios.content = valores.content;
    if (valores.occurred_at !== entrada.occurred_at) cambios.occurred_at = valores.occurred_at;
    if (Object.keys(cambios).length > 0) {
      await actualizar.mutateAsync({ entryId: entrada.id, cambios });
    }
    setEditandoId(null);
  }

  async function borrarEntrada(entryId: string) {
    if (!window.confirm("¿Borrar esta entrada de la bitácora? No se puede deshacer.")) {
      return;
    }
    setErrorPorEntrada((prev) => {
      const siguiente = { ...prev };
      delete siguiente[entryId];
      return siguiente;
    });
    try {
      await borrar.mutateAsync(entryId);
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : "No se pudo borrar la entrada.";
      setErrorPorEntrada((prev) => ({ ...prev, [entryId]: mensaje }));
    }
  }

  if (paciente.isLoading) {
    return (
      <div style={{ padding: 24 }}>
        Cargando…
        <SlowHint />
      </div>
    );
  }
  if (paciente.error || !paciente.data) {
    return (
      <div style={{ padding: 24, color: "#c00" }}>
        {paciente.error instanceof Error ? paciente.error.message : "Error"}
      </div>
    );
  }

  return (
    <main style={styles.wrap}>
      <AppHeader />
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

        {entradas.isLoading && (
          <>
            <p>Cargando bitácora…</p>
            <SlowHint />
          </>
        )}
        {entradas.error && (
          <p style={styles.error}>
            {entradas.error instanceof Error ? entradas.error.message : "Error"}
          </p>
        )}
        {entradas.data && entradas.data.length === 0 && (
          <p style={styles.muted}>Sin entradas todavía.</p>
        )}
        <ul style={styles.list}>
          {entradas.data?.map((e) => {
            // Mostrar botones solo al autor es UX; quien autoriza es RLS.
            const esMia = e.author_id === session?.user.id;
            if (editandoId === e.id && id) {
              return (
                <li key={e.id}>
                  <EntryForm
                    patientId={id}
                    initialValues={e}
                    onSubmit={(valores) => guardarEdicion(e, valores)}
                    onCancel={() => setEditandoId(null)}
                  />
                </li>
              );
            }
            return (
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
                {esMia && (
                  <div style={styles.entryActions}>
                    <button onClick={() => setEditandoId(e.id)} style={styles.linkButton}>
                      Editar
                    </button>
                    <button
                      onClick={() => borrarEntrada(e.id)}
                      disabled={borrar.isPending && borrar.variables === e.id}
                      style={{ ...styles.linkButton, color: "#c00" }}
                    >
                      {borrar.isPending && borrar.variables === e.id ? "Borrando…" : "Borrar"}
                    </button>
                  </div>
                )}
                {errorPorEntrada[e.id] && (
                  <p style={styles.error}>{errorPorEntrada[e.id]}</p>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section style={styles.section}>
        <h2>Red de cuidado</h2>
        {id && <MembersPanel patientId={id} />}
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
  entryActions: { display: "flex", gap: 12, marginTop: 8, fontSize: 13 },
  linkButton: {
    padding: 0,
    border: "none",
    background: "none",
    color: "#0A84FF",
    cursor: "pointer",
    fontSize: 13,
  },
  error: { color: "#c00", fontSize: 13, margin: "6px 0 0" },
};
