import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { AppShell } from "../components/app-shell";
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
      <AppShell>
        <p className="muted" aria-busy="true">Cargando…</p>
        <SlowHint />
      </AppShell>
    );
  }
  if (paciente.error || !paciente.data) {
    return (
      <AppShell>
        <p className="alert" role="alert">
          {paciente.error instanceof Error ? paciente.error.message : "Error"}
        </p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <nav>
        <Link to="/">← Pacientes</Link>
      </nav>
      <header className="stack-sm">
        <h1>{paciente.data.nombre}</h1>
        {paciente.data.fecha_nacimiento && (
          <p className="muted">
            Nacido {new Date(paciente.data.fecha_nacimiento).toLocaleDateString("es-CL")}
          </p>
        )}
        {paciente.data.notas && <p>{paciente.data.notas}</p>}
      </header>

      <section className="stack">
        <h2>Registrar en la bitácora</h2>
        {id && <EntryForm patientId={id} />}
      </section>

      <section className="stack">
        <div className="row-between">
          <h2>Bitácora</h2>
          <select
            value={filtroKind}
            onChange={(e) => setFiltroKind(e.target.value as Kind | "")}
            className="input"
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
            <p className="muted">Cargando bitácora…</p>
            <SlowHint />
          </>
        )}
        {entradas.error && (
          <p className="alert" role="alert">
            {entradas.error instanceof Error ? entradas.error.message : "Error"}
          </p>
        )}
        {entradas.data && entradas.data.length === 0 && (
          <p className="muted">Sin entradas todavía.</p>
        )}
        <ul className="list-reset stack-sm">
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
              <li key={e.id} className="card stack-sm">
                <div className="row small">
                  <span className="badge">{KIND_LABELS[e.kind]}</span>
                  <span className="muted">
                    {new Date(e.occurred_at).toLocaleString("es-CL")}
                  </span>
                  <strong>
                    {autorPorId[e.author_id] ?? "autor desconocido"}
                  </strong>
                </div>
                <p className="entry-content">{e.content}</p>
                {esMia && (
                  <div className="row">
                    <button onClick={() => setEditandoId(e.id)} className="btn btn-ghost">
                      Editar
                    </button>
                    <button
                      onClick={() => borrarEntrada(e.id)}
                      disabled={borrar.isPending && borrar.variables === e.id}
                      className="btn btn-ghost btn-danger"
                    >
                      {borrar.isPending && borrar.variables === e.id ? "Borrando…" : "Borrar"}
                    </button>
                  </div>
                )}
                {errorPorEntrada[e.id] && (
                  <p className="field-error" role="alert">{errorPorEntrada[e.id]}</p>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="stack">
        <h2>Red de cuidado</h2>
        {id && <MembersPanel patientId={id} />}
      </section>
    </AppShell>
  );
}

