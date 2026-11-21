import { useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";

import { KindChip } from "../components/kind-chip";
import { PatientLayout } from "../components/patient-layout";
import { SlowHint } from "../components/slow-hint";
import { useCrearTurno, useEliminarTurno, useEntradasDesde, useTurnos } from "../hooks/use-api";
import { useAhora } from "../hooks/use-ahora";
import { useAutores } from "../hooks/use-autores";
import type { Schemas } from "../lib/api";
import { useAuth } from "../providers/auth-provider";
import d from "../styles/patient-detail.module.css";
import s from "../styles/secciones.module.css";
import { diaLargo, horaCorta } from "../utils/bitacora";
import { mensajeError } from "../utils/errores";

type Turno = Schemas["Turno"];

export default function PatientTurnosPage() {
  return <PatientLayout seccion="Turnos">{() => <Turnos />}</PatientLayout>;
}

function Turnos() {
  const { id } = useParams();
  const turnos = useTurnos(id);
  const { autorDe, miembros } = useAutores(id);
  const { session } = useAuth();
  const ahora = useAhora();
  const eliminar = useEliminarTurno(id);
  const yo = session?.user.id;
  const miRol = miembros.data?.find((m) => m.user_id === yo)?.role;

  const lista = turnos.data ?? [];
  const t = (iso: string) => new Date(iso).getTime();
  const actuales = lista.filter((x) => t(x.inicio) <= ahora && ahora < t(x.fin));
  const proximos = lista.filter((x) => t(x.inicio) > ahora);
  const recientes = lista.filter((x) => t(x.fin) <= ahora).reverse();
  const nombre = (uid: string) => autorDe(uid).etiqueta ?? "…";
  const puedeCancelar = (x: Turno) =>
    x.creado_por === yo || x.cuidador_id === yo || miRol === "admin";

  async function cancelar(x: Turno) {
    if (!window.confirm(`¿Cancelar el turno de ${nombre(x.cuidador_id)}?`)) return;
    eliminar.mutate(x.id);
  }

  return (
    <section className={`stack ${d.section}`} aria-labelledby="titulo-turnos">
      <h2 id="titulo-turnos">Turnos de cuidado</h2>
      <p className={`muted ${s.intro}`}>
        Organicen quién está a cargo y cuándo. Al terminar un turno, quien llega puede ver lo que se
        registró en la bitácora mientras tanto.
      </p>

      {turnos.isLoading && (
        <div aria-busy="true">
          <SlowHint />
          <div className={`skeleton ${d.skeletonEntry}`} />
        </div>
      )}
      {turnos.error && (
        <p className="alert" role="alert">
          {mensajeError(turnos.error)}
        </p>
      )}

      {turnos.data && (
        <div className={`card stack-sm ${s.destacado}`} aria-live="polite">
          <h3>De turno ahora</h3>
          {actuales.length === 0 ? (
            <p className="muted">Nadie está de turno ahora.</p>
          ) : (
            actuales.map((x) => (
              <div key={x.id} className="stack-sm">
                <p>
                  <strong>{nombre(x.cuidador_id)}</strong> hasta las {horaCorta(x.fin)}
                </p>
                {id && <ResumenTurno patientId={id} turno={x} titulo="Registrado en este turno" />}
              </div>
            ))
          )}
        </div>
      )}

      {id && miRol && <AgendarTurno patientId={id} miRol={miRol} miembros={miembros.data ?? []} />}

      {turnos.data && (
        <div className="stack-sm">
          <h3>Próximos turnos</h3>
          {proximos.length === 0 && <p className="muted">No hay turnos agendados.</p>}
          <ul className={`list-reset ${s.lista}`}>
            {proximos.map((x) => (
              <li key={x.id} className={`card ${s.item}`}>
                <div className={s.itemPrincipal}>
                  <p className={s.itemTitulo}>{nombre(x.cuidador_id)}</p>
                  <p className="muted small">
                    {diaLargo(x.inicio)} · {horaCorta(x.inicio)} a {horaCorta(x.fin)}
                    {new Date(x.fin).toDateString() !== new Date(x.inicio).toDateString() &&
                      ` (${diaLargo(x.fin)})`}
                  </p>
                </div>
                {puedeCancelar(x) && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-danger"
                    onClick={() => cancelar(x)}
                    disabled={eliminar.isPending}
                  >
                    Cancelar turno
                  </button>
                )}
              </li>
            ))}
          </ul>
          {eliminar.isError && (
            <p className="alert" role="alert">
              {mensajeError(eliminar.error)}
            </p>
          )}
        </div>
      )}

      {recientes.length > 0 && id && (
        <div className="stack-sm">
          <h3>Turnos recientes (relevo)</h3>
          <ul className={`list-reset ${s.lista}`}>
            {recientes.map((x) => (
              <TurnoReciente key={x.id} patientId={id} turno={x} nombre={nombre(x.cuidador_id)} />
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function TurnoReciente({ patientId, turno, nombre }: { patientId: string; turno: Turno; nombre: string }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <li className={`card ${s.item}`}>
      <div className={s.itemPrincipal}>
        <p className={s.itemTitulo}>{nombre}</p>
        <p className="muted small">
          {diaLargo(turno.inicio)} · {horaCorta(turno.inicio)} a {horaCorta(turno.fin)}
        </p>
      </div>
      <button
        type="button"
        className="btn btn-ghost"
        aria-expanded={abierto}
        onClick={() => setAbierto((v) => !v)}
      >
        {abierto ? "Ocultar" : "Ver lo registrado"}
      </button>
      {abierto && (
        <div className={s.anchoCompleto}>
          <ResumenTurno patientId={patientId} turno={turno} titulo="Registrado durante el turno" />
        </div>
      )}
    </li>
  );
}

/** Relevo: lo que se anotó en la bitácora dentro de la ventana del turno. */
function ResumenTurno({ patientId, turno, titulo }: { patientId: string; turno: Turno; titulo: string }) {
  const entradas = useEntradasDesde(patientId, turno.inicio);
  const { autorDe } = useAutores(patientId);
  if (entradas.isLoading) return <p className="muted small">Cargando registros del turno…</p>;
  if (entradas.error) return <p className="field-error">{mensajeError(entradas.error)}</p>;
  const fin = new Date(turno.fin).getTime();
  const delTurno = (entradas.data ?? []).filter((e) => new Date(e.occurred_at).getTime() < fin);
  if (delTurno.length === 0) {
    return <p className="muted small">{titulo}: todavía no hay registros.</p>;
  }
  const autores = new Set(delTurno.map((e) => e.author_id)).size;
  return (
    <div className={s.citas}>
      <p className="small">
        <strong>{titulo}:</strong> {delTurno.length} {delTurno.length === 1 ? "registro" : "registros"}{" "}
        de {autores} {autores === 1 ? "persona" : "personas"}.
      </p>
      {delTurno.slice(0, 10).map((e) => (
        <div key={e.id} className={s.cita}>
          <span className="row small">
            <KindChip kind={e.kind} /> {horaCorta(e.occurred_at)} ·{" "}
            {autorDe(e.author_id).etiqueta ?? "…"}
          </span>
          <span>{e.content}</span>
        </div>
      ))}
    </div>
  );
}

function hoyLocal(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function AgendarTurno({
  patientId,
  miRol,
  miembros,
}: {
  patientId: string;
  miRol: string;
  miembros: Schemas["CareMember"][];
}) {
  const crear = useCrearTurno(patientId);
  const { session } = useAuth();
  const yo = session?.user.id ?? "";
  // Un admin agenda a cualquier admin o cuidador; un cuidador solo a sí mismo.
  const elegibles = miembros.filter(
    (m) => (m.role === "admin" || m.role === "caregiver") && (miRol === "admin" || m.user_id === yo)
  );
  const [cuidador, setCuidador] = useState(yo);
  const [fecha, setFecha] = useState(hoyLocal());
  const [desde, setDesde] = useState("08:00");
  const [hasta, setHasta] = useState("20:00");
  const [aviso, setAviso] = useState<string | null>(null);

  if (miRol === "viewer") {
    return (
      <p className="card muted">
        Tu rol en este grupo es de lectura: puedes ver los turnos, pero no tomar ni agendar turnos.
      </p>
    );
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const inicio = new Date(`${fecha}T${desde}`);
    const fin = new Date(`${fecha}T${hasta}`);
    // "20:00 a 08:00" es un turno de noche: termina al día siguiente.
    if (fin <= inicio) fin.setDate(fin.getDate() + 1);
    setAviso(null);
    crear.mutate(
      { cuidador_id: cuidador || yo, inicio: inicio.toISOString(), fin: fin.toISOString() },
      { onSuccess: () => setAviso("Turno agendado ✓") }
    );
  }

  return (
    <form onSubmit={onSubmit} className="card stack" aria-label="Agendar turno">
      <h3>Agendar un turno</h3>
      <div className={`${s.campos} ${s.campos2}`}>
        <label className="field">
          <span className="field-label">Persona a cargo</span>
          <select
            className="input"
            value={cuidador}
            onChange={(e) => setCuidador(e.target.value)}
            disabled={elegibles.length <= 1}
          >
            {elegibles.map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {m.user_id === yo ? `Yo (${m.nombre || m.email})` : m.nombre || m.email}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field-label">Día</span>
          <input type="date" className="input" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
        </label>
        <label className="field">
          <span className="field-label">Desde</span>
          <input type="time" className="input" value={desde} onChange={(e) => setDesde(e.target.value)} required />
        </label>
        <label className="field">
          <span className="field-label">Hasta</span>
          <input type="time" className="input" value={hasta} onChange={(e) => setHasta(e.target.value)} required />
        </label>
      </div>
      <p className="muted small">Si la hora de término es menor, el turno termina al día siguiente.</p>
      <div className="row">
        <button type="submit" className="btn btn-primary" disabled={crear.isPending}>
          {crear.isPending ? "Agendando…" : "Agendar turno"}
        </button>
        <span aria-live="polite" className={aviso ? "badge badge-success" : undefined}>
          {aviso}
        </span>
      </div>
      {crear.isError && (
        <p className="alert" role="alert">
          {mensajeError(crear.error)}
        </p>
      )}
    </form>
  );
}
