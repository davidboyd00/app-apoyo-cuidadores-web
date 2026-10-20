import { Link } from "react-router-dom";

import { AppShell } from "../components/app-shell";
import { KindChip } from "../components/kind-chip";
import { SlowHint } from "../components/slow-hint";
import { usePatientEntries, usePatients } from "../hooks/use-api";
import { useTituloPagina } from "../hooks/use-titulo-pagina";
import type { Schemas } from "../lib/api";
import s from "../styles/patients.module.css";
import { edad, fechaCompleta, tiempoRelativo } from "../utils/bitacora";

export default function PatientsPage() {
  useTituloPagina("Personas que cuidas");
  const { data: pacientes, isLoading, error } = usePatients();
  const hayPacientes = !!pacientes && pacientes.length > 0;

  return (
    <AppShell>
      <div className="row-between">
        <h1>Personas que cuidas</h1>
        {hayPacientes && (
          <Link to="/patients/new" className="btn btn-primary">
            Agregar persona
          </Link>
        )}
      </div>

      {isLoading && (
        <div className="stack" aria-busy="true">
          <SlowHint />
          <div className={s.grid}>
            {[0, 1, 2].map((i) => (
              <div key={i} className={`skeleton ${s.skeletonCard}`} />
            ))}
          </div>
          <span className="visually-hidden">Cargando pacientes…</span>
        </div>
      )}

      {error && (
        <p className="alert" role="alert">
          {error instanceof Error ? error.message : "Error"}
        </p>
      )}

      {pacientes && pacientes.length === 0 && <EstadoVacio />}

      {hayPacientes && (
        <ul className={`list-reset ${s.grid}`}>
          {pacientes.map((p) => (
            <li key={p.id}>
              <PatientCard paciente={p} />
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}

function PatientCard({ paciente }: { paciente: Schemas["Patient"] }) {
  // Una entrada por tarjeta: barato con pocos pacientes por usuario.
  const ultima = usePatientEntries(paciente.id, { limit: 1 });
  const anios = edad(paciente.fecha_nacimiento);
  const entrada = ultima.data?.[0];

  return (
    <Link to={`/patients/${paciente.id}`} className={`card ${s.cardLink}`}>
      <div className="stack-sm">
        <span className={s.name}>{paciente.nombre}</span>
        {anios !== null && <span className="muted small">{anios} años</span>}
      </div>

      <div className={s.ultima}>
        {ultima.isLoading && <span className="muted">Cargando última entrada…</span>}
        {ultima.error && <span className="muted">No pudimos cargar la bitácora.</span>}
        {ultima.data && !entrada && <span className="muted">Sin entradas todavía.</span>}
        {entrada && (
          <>
            <div className="row">
              <KindChip kind={entrada.kind} />
              <time className="muted" dateTime={entrada.occurred_at} title={fechaCompleta(entrada.occurred_at)}>
                {tiempoRelativo(entrada.occurred_at)}
              </time>
            </div>
            <p className={s.resumen}>{entrada.content}</p>
          </>
        )}
      </div>
    </Link>
  );
}

function EstadoVacio() {
  return (
    <div className={`card stack ${s.empty}`}>
      <IlustracionCuidado />
      <h2>Empieza por la persona que cuidas</h2>
      <p className={`muted ${s.emptyText}`}>
        Crea su ficha para registrar el día a día y compartirlo con tu familia. Quien la
        crea queda como administrador del grupo.
      </p>
      <Link to="/patients/new" className="btn btn-primary">
        Agregar a la persona que cuidas
      </Link>
    </div>
  );
}

function IlustracionCuidado() {
  // Dos figuras simples bajo un techo con corazón: cuidado en familia.
  return (
    <svg className={s.emptyArt} viewBox="0 0 160 120" aria-hidden="true">
      <path
        d="M20 58 80 14l60 44"
        fill="none"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.35"
      />
      <path
        d="M80 52c-5-3.4-9-7-9-11a4.6 4.6 0 0 1 9-1.6 4.6 4.6 0 0 1 9 1.6c0 4-4 7.6-9 11z"
        className={s.emptyHeart}
      />
      <circle cx="58" cy="66" r="9" fill="currentColor" />
      <path d="M42 110c0-14 7-26 16-26s16 12 16 26z" fill="currentColor" />
      <circle cx="102" cy="72" r="8" fill="currentColor" opacity="0.6" />
      <path d="M88 110c0-12 6-22 14-22s14 10 14 22z" fill="currentColor" opacity="0.6" />
      <path d="M14 110h132" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.25" />
    </svg>
  );
}
