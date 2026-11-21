import type { ReactNode } from "react";
import { Link, NavLink, useParams } from "react-router-dom";

import { AppShell } from "./app-shell";
import { Avatar } from "./avatar";
import { SlowHint } from "./slow-hint";
import { usePatient, useRelevo } from "../hooks/use-api";
import { useTituloPagina } from "../hooks/use-titulo-pagina";
import type { Schemas } from "../lib/api";
import s from "../styles/patient-detail.module.css";
import { edad } from "../utils/bitacora";
import { mensajeError } from "../utils/errores";

// Secciones de la ficha de una persona. Cada una es una ruta propia, así el
// enlace se puede compartir y el botón "atrás" del celular funciona.
const SECCIONES = [
  { ruta: "", etiqueta: "Bitácora" },
  { ruta: "turnos", etiqueta: "Turnos" },
  { ruta: "medicamentos", etiqueta: "Medicamentos" },
  { ruta: "asistente", etiqueta: "Asistente" },
  { ruta: "resumenes", etiqueta: "Resúmenes" },
  { ruta: "red", etiqueta: "Red de cuidado" },
];

type Props = {
  seccion: string;
  children: (paciente: Schemas["Patient"]) => ReactNode;
};

/** Cabecera de la persona cuidada + pestañas de secciones. */
export function PatientLayout({ seccion, children }: Props) {
  const { id } = useParams();
  const paciente = usePatient(id);
  useTituloPagina(paciente.data ? `${seccion} · ${paciente.data.nombre}` : seccion);

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
  if (paciente.error || !paciente.data || !id) {
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
        <div className={s.heroIdentidad}>
          <div className={s.heroAvatar}>
            <Avatar nombre={paciente.data.nombre} clave={paciente.data.id} desconocido={false} />
          </div>
          <div className="stack-sm">
            <h1>{paciente.data.nombre}</h1>
            {anios !== null && <p className="muted">{anios} años</p>}
            {paciente.data.notas && <p className={s.notas}>{paciente.data.notas}</p>}
          </div>
        </div>
        <RelevoBadge patientId={id} />
      </header>

      <nav className={s.tabs} aria-label="Secciones de la ficha">
        {SECCIONES.map((sec) => (
          <NavLink
            key={sec.ruta}
            end
            to={sec.ruta ? `/patients/${id}/${sec.ruta}` : `/patients/${id}`}
            className={({ isActive }) => `${s.tab} ${isActive ? s.tabActiva : ""}`}
          >
            {sec.etiqueta}
          </NavLink>
        ))}
      </nav>

      {children(paciente.data)}
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
