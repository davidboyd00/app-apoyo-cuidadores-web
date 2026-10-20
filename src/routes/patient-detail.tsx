import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { AppShell } from "../components/app-shell";
import { Avatar } from "../components/avatar";
import { EntryForm, type EntryValues } from "../components/entry-form";
import { KindChip } from "../components/kind-chip";
import { MembersPanel } from "../components/members-panel";
import { SlowHint } from "../components/slow-hint";
import {
  useBitacora,
  useDeleteEntry,
  useMembers,
  usePatient,
  useRelevo,
  useUpdateEntry,
} from "../hooks/use-api";
import { useTituloPagina } from "../hooks/use-titulo-pagina";
import type { Schemas } from "../lib/api";
import { supabase } from "../lib/supabase";
import { useAuth } from "../providers/auth-provider";
import s from "../styles/patient-detail.module.css";
import {
  KINDS,
  KIND_LABELS,
  edad,
  fechaCompleta,
  tiempoRelativo,
  type Kind,
} from "../utils/bitacora";
import { mensajeError } from "../utils/errores";

// supabase-js reutiliza un canal con el mismo nombre y removeChannel es
// async: con StrictMode (montar → desmontar → montar) el segundo `.on()`
// caería sobre el canal ya suscrito y lanzaría. Un sufijo por suscripción
// lo evita.
let contadorCanales = 0;

export default function PatientDetailPage() {
  const { id } = useParams();
  const paciente = usePatient(id);
  const [filtroKind, setFiltroKind] = useState<Kind | "">("");
  const bitacora = useBitacora(id, filtroKind || undefined);
  const entradas = bitacora.data?.pages.flat();
  const miembros = useMembers(id);
  const { session } = useAuth();
  const actualizar = useUpdateEntry(id);
  const borrar = useDeleteEntry(id);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [errorPorEntrada, setErrorPorEntrada] = useState<Record<string, string>>({});
  const qc = useQueryClient();
  useTituloPagina(paciente.data?.nombre);

  const [enVivoCaido, setEnVivoCaido] = useState(false);
  // Manejo de foco: al salir de edición vuelve al botón "Editar" de esa
  // entrada; al borrar, al título "Registros" (el elemento ya no existe).
  const botonesEditar = useRef(new Map<string, HTMLButtonElement>());
  const tituloRegistros = useRef<HTMLHeadingElement>(null);
  const focoTrasEditar = useRef<string | null>(null);
  const [anuncio, setAnuncio] = useState("");

  // Cuando el botón "Editar" vuelve a existir (fin de la edición), le
  // devolvemos el foco.
  useEffect(() => {
    if (editandoId || !focoTrasEditar.current) return;
    botonesEditar.current.get(focoTrasEditar.current)?.focus();
    focoTrasEditar.current = null;
  }, [editandoId]);

  function salirDeEdicion(entryId: string) {
    focoTrasEditar.current = entryId;
    setEditandoId(null);
  }

  // Realtime: cuando otro familiar registra o edita una entrada, refrescamos
  // el feed. RLS (entries_select) también filtra los eventos que llegan.
  // DELETE no se escucha a propósito: Supabase no aplica filtros ni RLS a
  // los eventos DELETE (llegarían ids de otros pacientes); los borrados se
  // ven al refrescar (foco de la pestaña, staleTime o la próxima acción).
  useEffect(() => {
    if (!id) return;
    const filtro = {
      schema: "public",
      table: "log_entries",
      filter: `patient_id=eq.${id}`,
    };
    const refrescar = () => {
      void qc.invalidateQueries({ queryKey: ["patients", id, "entries"] });
    };
    const canal = supabase
      .channel(`bitacora:${id}:${++contadorCanales}`)
      .on("postgres_changes", { event: "INSERT", ...filtro }, refrescar)
      .on("postgres_changes", { event: "UPDATE", ...filtro }, refrescar)
      .subscribe((estado) => {
        if (estado === "SUBSCRIBED") setEnVivoCaido(false);
        if (estado === "CHANNEL_ERROR" || estado === "TIMED_OUT") setEnVivoCaido(true);
      });
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

  // Etiqueta del autor (KPI de relevo: siempre visible quién escribió).
  // - "Tú" para las propias.
  // - Mientras cargan los miembros: sin etiqueta (placeholder), para no
  //   mostrar un "desconocido" que después cambia.
  // - Autor que ya no está en list_care_members: fue removido de la red.
  function autorDe(authorId: string, esMia: boolean) {
    const nombre = autorPorId[authorId] ?? null;
    if (esMia) return { nombre: nombre ?? "Tú", etiqueta: "Tú" };
    if (nombre) return { nombre, etiqueta: nombre };
    if (miembros.isLoading) return { nombre: null, etiqueta: null };
    if (miembros.error) return { nombre: null, etiqueta: "Autor no disponible" };
    return { nombre: null, etiqueta: "Ex integrante de la red" };
  }

  // Solo se envían los campos que cambiaron; si no cambió nada, se cierra.
  async function guardarEdicion(entrada: Schemas["Entry"], valores: EntryValues) {
    const cambios: Schemas["EntryUpdate"] = {};
    if (valores.kind !== entrada.kind) cambios.kind = valores.kind;
    if (valores.content !== entrada.content) cambios.content = valores.content;
    if (valores.occurred_at !== entrada.occurred_at) cambios.occurred_at = valores.occurred_at;
    if (Object.keys(cambios).length > 0) {
      await actualizar.mutateAsync({ entryId: entrada.id, cambios });
      setAnuncio("Cambios guardados.");
    }
    salirDeEdicion(entrada.id);
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
      setAnuncio("Entrada borrada.");
      tituloRegistros.current?.focus();
    } catch (err) {
      const mensaje = mensajeError(err, "No se pudo borrar la entrada.");
      setErrorPorEntrada((prev) => ({ ...prev, [entryId]: mensaje }));
    }
  }

  if (paciente.isLoading) {
    return (
      <AppShell>
        <div className="stack" aria-busy="true">
          <SlowHint />
          <div className={`skeleton ${s.skeletonEntry}`} />
          <span className="visually-hidden">Cargando…</span>
        </div>
      </AppShell>
    );
  }
  if (paciente.error || !paciente.data) {
    return (
      <AppShell>
        <p className="alert" role="alert">
          {mensajeError(paciente.error)}
        </p>
        <Link to="/">← Volver</Link>
      </AppShell>
    );
  }

  const anios = edad(paciente.data.fecha_nacimiento);

  return (
    <AppShell>
      <nav>
        <Link to="/">← Personas que cuidas</Link>
      </nav>

      <header className={`card ${s.hero}`}>
        <div className="stack-sm">
          <h1>{paciente.data.nombre}</h1>
          {anios !== null && <p className="muted">{anios} años</p>}
          {paciente.data.notas && <p className={s.notas}>{paciente.data.notas}</p>}
        </div>
        {id && <RelevoBadge patientId={id} />}
      </header>

      <nav className={s.tabs} aria-label="Secciones del paciente">
        <a href="#bitacora" className={s.tab}>
          Bitácora
        </a>
        <a href="#red" className={s.tab}>
          Red de cuidado
        </a>
      </nav>

      <section id="bitacora" className={`stack ${s.section}`} aria-labelledby="titulo-bitacora">
        <h2 id="titulo-bitacora">Bitácora</h2>
        <p className="visually-hidden" aria-live="polite">
          {anuncio}
        </p>
        <p className={`muted small ${s.avisoEnVivo}`} aria-live="polite">
          {enVivoCaido &&
            "Las actualizaciones en vivo no están disponibles ahora; la bitácora se refresca al volver a esta pestaña."}
        </p>
        {id && <EntryForm patientId={id} />}

        <div className="row-between">
          <h3 ref={tituloRegistros} tabIndex={-1}>
            Registros
          </h3>
          <label className="row small">
            <span className="field-label">Mostrar</span>
            <select
              value={filtroKind}
              onChange={(e) => setFiltroKind(e.target.value as Kind | "")}
              className="input"
            >
              <option value="">Todos los tipos</option>
              {KINDS.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {bitacora.isLoading && (
          <div className="stack" aria-busy="true">
            <SlowHint />
            {[0, 1, 2].map((i) => (
              <div key={i} className={`skeleton ${s.skeletonEntry}`} />
            ))}
            <span className="visually-hidden">Cargando bitácora…</span>
          </div>
        )}
        {bitacora.isError && !bitacora.isFetchNextPageError && (
          <p className="alert" role="alert">
            {mensajeError(bitacora.error)}
          </p>
        )}
        {entradas && entradas.length === 0 && (
          <p className={`card muted ${s.empty}`}>
            {filtroKind
              ? `No hay registros de tipo "${KIND_LABELS[filtroKind]}".`
              : "Todavía no hay registros. Anota el primero arriba."}
          </p>
        )}

        {entradas && entradas.length > 0 && (
          <ol className={`list-reset ${s.timeline}`}>
            {entradas.map((e) => {
              // Mostrar botones solo al autor es UX; quien autoriza es RLS.
              const esMia = e.author_id === session?.user.id;
              const autor = autorDe(e.author_id, esMia);
              return (
                <li key={e.id} className={s.entry}>
                  <Avatar
                    nombre={autor.nombre ?? ""}
                    clave={e.author_id}
                    desconocido={!autor.nombre && !miembros.isLoading}
                  />
                  {editandoId === e.id && id ? (
                    <div className={s.entryEdit}>
                      <EntryForm
                        patientId={id}
                        initialValues={e}
                        onSubmit={(valores) => guardarEdicion(e, valores)}
                        onCancel={() => salirDeEdicion(e.id)}
                      />
                    </div>
                  ) : (
                    <article className={`card ${s.entryCard}`}>
                      <div className={s.entryHead}>
                        {autor.etiqueta ? (
                          <strong>{autor.etiqueta}</strong>
                        ) : (
                          <>
                            <span className={`skeleton ${s.nameSkeleton}`} aria-hidden="true" />
                            <span className="visually-hidden">Cargando autor</span>
                          </>
                        )}
                        <time
                          className={s.entryTime}
                          dateTime={e.occurred_at}
                          title={fechaCompleta(e.occurred_at)}
                        >
                          {tiempoRelativo(e.occurred_at)}
                        </time>
                        <KindChip kind={e.kind} />
                      </div>
                      <p className="entry-content">{e.content}</p>
                      {esMia && (
                        <div className={s.entryActions}>
                          <button
                            ref={(el) => {
                              if (el) botonesEditar.current.set(e.id, el);
                              else botonesEditar.current.delete(e.id);
                            }}
                            onClick={() => setEditandoId(e.id)}
                            className="btn btn-ghost"
                            aria-label={`Editar entrada de ${tiempoRelativo(e.occurred_at)}`}
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => borrarEntrada(e.id)}
                            disabled={borrar.isPending && borrar.variables === e.id}
                            className="btn btn-ghost btn-danger"
                            aria-label={`Borrar entrada de ${tiempoRelativo(e.occurred_at)}`}
                          >
                            {borrar.isPending && borrar.variables === e.id
                              ? "Borrando…"
                              : "Borrar"}
                          </button>
                        </div>
                      )}
                      {errorPorEntrada[e.id] && (
                        <p className="field-error" role="alert">
                          {errorPorEntrada[e.id]}
                        </p>
                      )}
                    </article>
                  )}
                </li>
              );
            })}
          </ol>
        )}

        {bitacora.hasNextPage && (
          <button
            type="button"
            onClick={() => bitacora.fetchNextPage()}
            disabled={bitacora.isFetchingNextPage}
            className="btn"
          >
            {bitacora.isFetchingNextPage ? "Cargando…" : "Ver registros anteriores"}
          </button>
        )}
        {bitacora.isFetchNextPageError && (
          <p className="alert" role="alert">
            {mensajeError(bitacora.error)}
          </p>
        )}
      </section>

      <section id="red" className={`stack ${s.section}`} aria-labelledby="titulo-red">
        <h2 id="titulo-red">Red de cuidado</h2>
        {id && <MembersPanel patientId={id} />}
      </section>
    </AppShell>
  );
}

/**
 * KPI de relevo familiar: autores distintos en los últimos 7 días. La
 * ventana es móvil (backend: desde = ahora − 7 días, por occurred_at), no
 * la semana calendario; por eso el texto no dice "esta semana".
 */
function RelevoBadge({ patientId }: { patientId: string }) {
  const relevo = useRelevo(patientId);
  // Si falla o carga, no mostramos nada: es informativo, no bloqueante.
  if (!relevo.data) return null;

  const n = relevo.data.autores_distintos;
  const ayuda = "Relevo familiar: personas distintas que registraron en los últimos 7 días.";
  if (relevo.data.cumple_kpi) {
    return (
      <span className="badge badge-success" title={ayuda}>
        {n} autores en los últimos 7 días ✓
      </span>
    );
  }
  return (
    <span className="badge badge-warning" title={ayuda}>
      {n === 0 ? "Sin registros en los últimos 7 días" : "Solo 1 autor en los últimos 7 días"}
    </span>
  );
}
