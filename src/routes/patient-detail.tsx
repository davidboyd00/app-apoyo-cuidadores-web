import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";

import { Avatar } from "../components/avatar";
import { EntryForm, type EntryValues } from "../components/entry-form";
import { HistorialEntrada } from "../components/historial-entrada";
import { KindChip } from "../components/kind-chip";
import { PatientLayout } from "../components/patient-layout";
import { SlowHint } from "../components/slow-hint";
import { useAnularEntry, useBitacora, useRevisarEntry } from "../hooks/use-api";
import { useAhora } from "../hooks/use-ahora";
import { useAutores } from "../hooks/use-autores";
import type { Schemas } from "../lib/api";
import { esDosis, quitar, type PendienteEntrada } from "../lib/outbox";
import { supabase } from "../lib/supabase";
import { useAuth } from "../providers/auth-provider";
import { useSincronizacion } from "../providers/sync-provider";
import s from "../styles/patient-detail.module.css";
import { KINDS, KIND_LABELS, fechaCompleta, tiempoRelativo, type Kind } from "../utils/bitacora";
import { mensajeError } from "../utils/errores";

// supabase-js reutiliza un canal con el mismo nombre y removeChannel es
// async: con StrictMode (montar → desmontar → montar) el segundo `.on()`
// caería sobre el canal ya suscrito y lanzaría. Un sufijo por suscripción
// lo evita.
let contadorCanales = 0;

export default function PatientDetailPage() {
  return <PatientLayout seccion="Bitácora">{() => <Bitacora />}</PatientLayout>;
}

function Bitacora() {
  const { id } = useParams();
  const [filtroKind, setFiltroKind] = useState<Kind | "">("");
  const bitacora = useBitacora(id, filtroKind || undefined);
  const entradas = bitacora.data?.pages.flat();
  const { autorDe, cargando: cargandoAutores } = useAutores(id);
  const { session } = useAuth();
  const revisar = useRevisarEntry(id);
  const anular = useAnularEntry(id);
  const { pendientes } = useSincronizacion();
  const ahora = useAhora();
  const [anulandoId, setAnulandoId] = useState<string | null>(null);
  const [motivoAnulacion, setMotivoAnulacion] = useState("");
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [historialAbierto, setHistorialAbierto] = useState<Set<string>>(new Set());
  const [errorPorEntrada, setErrorPorEntrada] = useState<Record<string, string>>({});
  const qc = useQueryClient();

  const [enVivoCaido, setEnVivoCaido] = useState(false);
  // Manejo de foco: al salir de edición vuelve al botón "Editar" de esa
  // entrada; al borrar, al título "Registros" (el elemento ya no existe).
  const botonesEditar = useRef(new Map<string, HTMLButtonElement>());
  const tituloRegistros = useRef<HTMLHeadingElement>(null);
  const focoTrasEditar = useRef<string | null>(null);
  const [anuncio, setAnuncio] = useState("");

  useEffect(() => {
    if (editandoId || !focoTrasEditar.current) return;
    botonesEditar.current.get(focoTrasEditar.current)?.focus();
    focoTrasEditar.current = null;
  }, [editandoId]);

  function salirDeEdicion(entryId: string) {
    focoTrasEditar.current = entryId;
    setEditandoId(null);
  }

  // Realtime: entradas nuevas y correcciones/anulaciones de otros familiares
  // refrescan el feed. RLS filtra los eventos que llegan.
  useEffect(() => {
    if (!id) return;
    const filtro = { schema: "public", filter: `patient_id=eq.${id}` };
    const refrescar = () => {
      void qc.invalidateQueries({ queryKey: ["patients", id, "entries"] });
    };
    const canal = supabase
      .channel(`bitacora:${id}:${++contadorCanales}`)
      .on("postgres_changes", { event: "INSERT", table: "log_entries", ...filtro }, refrescar)
      .on("postgres_changes", { event: "INSERT", table: "log_entry_revisions", ...filtro }, refrescar)
      .subscribe((estado) => {
        if (estado === "SUBSCRIBED") setEnVivoCaido(false);
        if (estado === "CHANNEL_ERROR" || estado === "TIMED_OUT") setEnVivoCaido(true);
      });
    return () => {
      void supabase.removeChannel(canal);
    };
  }, [id, qc]);

  // Historial inmutable: editar agrega una revisión con motivo; la fila
  // original no cambia. Solo se envía si cambió algo (comparando sin espacios
  // de los bordes, como los recorta el formulario).
  async function guardarEdicion(entrada: Schemas["Entry"], valores: EntryValues) {
    const cambio =
      valores.kind !== entrada.kind ||
      valores.content.trim() !== entrada.content.trim() ||
      valores.occurred_at !== entrada.occurred_at;
    if (cambio) {
      await revisar.mutateAsync({
        entryId: entrada.id,
        cambios: {
          motivo: valores.motivo ?? "",
          kind: valores.kind,
          content: valores.content,
          occurred_at: valores.occurred_at,
        },
      });
      setAnuncio("Cambios guardados. La versión anterior queda en el historial.");
    }
    salirDeEdicion(entrada.id);
  }

  // "Borrar" es una anulación con motivo: la entrada deja de verse, pero queda
  // en el historial con quién la borró, cuándo y por qué.
  async function confirmarAnulacion(entryId: string) {
    const motivo = motivoAnulacion.trim();
    setErrorPorEntrada((prev) => {
      const siguiente = { ...prev };
      delete siguiente[entryId];
      return siguiente;
    });
    try {
      await anular.mutateAsync({ entryId, motivo });
      setAnulandoId(null);
      setMotivoAnulacion("");
      setAnuncio("Entrada borrada. Queda registrada en el historial.");
      tituloRegistros.current?.focus();
    } catch (err) {
      const mensaje = mensajeError(err, "No se pudo borrar la entrada.");
      setErrorPorEntrada((prev) => ({ ...prev, [entryId]: mensaje }));
    }
  }

  function alternarHistorial(entryId: string) {
    setHistorialAbierto((prev) => {
      const siguiente = new Set(prev);
      if (siguiente.has(entryId)) siguiente.delete(entryId);
      else siguiente.add(entryId);
      return siguiente;
    });
  }

  // Un registro pendiente que el servidor rechazó: el usuario decide si lo
  // descarta. Es dato clínico: se pide confirmación.
  function descartarPendiente(p: PendienteEntrada) {
    if (!window.confirm("¿Descartar este registro que aún no se envió? Se pierde.")) return;
    quitar(p.client_id);
  }

  // Entradas de este paciente que siguen en la cola del navegador.
  const pendientesVisibles = pendientes.filter(
    (p): p is PendienteEntrada =>
      !esDosis(p) && p.patient_id === id && (!filtroKind || p.kind === filtroKind)
  );

  return (
    <section className={`stack ${s.section}`} aria-labelledby="titulo-bitacora">
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
      {entradas && entradas.length === 0 && pendientesVisibles.length === 0 && (
        <p className={`card muted ${s.empty}`}>
          {filtroKind
            ? `No hay registros de tipo "${KIND_LABELS[filtroKind]}".`
            : "Todavía no hay registros. Anota el primero arriba."}
        </p>
      )}

      {((entradas && entradas.length > 0) || pendientesVisibles.length > 0) && (
        <ol className={`list-reset ${s.timeline}`}>
          {pendientesVisibles.map((p) => (
            <li key={p.client_id} className={s.entry}>
              <Avatar nombre="Tú" clave={session?.user.id ?? "yo"} desconocido={false} />
              <article className={`card ${s.entryCard}`} data-kind={p.kind}>
                <div className={s.entryHead}>
                  <strong>Tú</strong>
                  <span className={p.error ? "badge badge-warning" : "badge"}>
                    {p.error ? "No se envió" : "Pendiente de sincronizar"}
                  </span>
                  <KindChip kind={p.kind} />
                </div>
                <p className="entry-content">{p.content}</p>
                {p.error && (
                  <>
                    <p className="field-error" role="alert">
                      {p.error}
                    </p>
                    <div className={s.entryActions}>
                      <button
                        type="button"
                        onClick={() => descartarPendiente(p)}
                        className="btn btn-ghost btn-danger"
                      >
                        Descartar
                      </button>
                    </div>
                  </>
                )}
              </article>
            </li>
          ))}
          {(entradas ?? []).map((e) => {
            // Mostrar botones solo al autor es UX; quien autoriza es RLS.
            const esMia = e.author_id === session?.user.id;
            const autor = autorDe(e.author_id);
            const verHistorial = historialAbierto.has(e.id);
            return (
              <li key={e.id} className={s.entry}>
                <Avatar
                  nombre={autor.nombre ?? ""}
                  clave={e.author_id}
                  desconocido={!autor.nombre && !cargandoAutores}
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
                  <article className={`card ${s.entryCard}`} data-kind={e.kind}>
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
                        {tiempoRelativo(e.occurred_at, ahora)}
                      </time>
                      <KindChip kind={e.kind} />
                      {e.source === "voice" && (
                        <span className="badge" title="Registrado por dictado de voz">
                          Por voz
                        </span>
                      )}
                      {esMia && anulandoId !== e.id && (
                        <div className={s.entryActions}>
                          <button
                            ref={(el) => {
                              if (el) botonesEditar.current.set(e.id, el);
                              else botonesEditar.current.delete(e.id);
                            }}
                            onClick={() => setEditandoId(e.id)}
                            className="btn btn-ghost"
                            aria-label={`Editar entrada de ${tiempoRelativo(e.occurred_at, ahora)}`}
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => {
                              setAnulandoId(e.id);
                              setMotivoAnulacion("");
                            }}
                            className="btn btn-ghost btn-danger"
                            aria-label={`Borrar entrada de ${tiempoRelativo(e.occurred_at, ahora)}`}
                          >
                            Borrar
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="entry-content">{e.content}</p>
                    {e.editada && (
                      <button
                        type="button"
                        className={s.editadaBoton}
                        aria-expanded={verHistorial}
                        onClick={() => alternarHistorial(e.id)}
                      >
                        <span className="badge">Editada</span>
                        {verHistorial ? "Ocultar historial" : "Ver historial de cambios"}
                      </button>
                    )}
                    {verHistorial && id && (
                      <HistorialEntrada patientId={id} entryId={e.id} autorDe={autorDe} />
                    )}
                    {esMia && anulandoId === e.id && (
                      <form
                        className="stack-sm"
                        aria-label="Borrar entrada"
                        onSubmit={(ev) => {
                          ev.preventDefault();
                          void confirmarAnulacion(e.id);
                        }}
                      >
                        <label className="field-label" htmlFor={`motivo-${e.id}`}>
                          Motivo para borrar
                        </label>
                        <input
                          id={`motivo-${e.id}`}
                          value={motivoAnulacion}
                          onChange={(ev) => setMotivoAnulacion(ev.target.value)}
                          maxLength={500}
                          className="input"
                          placeholder="Ej: Se registró en la persona equivocada."
                        />
                        <p className="muted small">
                          La entrada deja de verse, pero queda en el historial con quién la borró,
                          cuándo y por qué.
                        </p>
                        <div className={s.entryActions}>
                          <button
                            type="submit"
                            disabled={motivoAnulacion.trim().length < 3 || anular.isPending}
                            className="btn btn-ghost btn-danger"
                          >
                            {anular.isPending && anular.variables?.entryId === e.id
                              ? "Borrando…"
                              : "Confirmar borrado"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setAnulandoId(null)}
                            className="btn btn-ghost"
                          >
                            Cancelar
                          </button>
                        </div>
                      </form>
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
  );
}
