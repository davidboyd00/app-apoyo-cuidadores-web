import { useEffect, useId, useRef, useState } from "react";
import { Link, NavLink, useMatch, useNavigate } from "react-router-dom";

import { usePatients } from "../hooks/use-api";
import type { Schemas } from "../lib/api";
import { useAuth } from "../providers/auth-provider";
import s from "../styles/shell.module.css";
import { LogoMark } from "./logo";

// Solo guardamos el id (sin datos clínicos) para recordar el último paciente.
const ULTIMO_PACIENTE_KEY = "cuidadores:ultimo-paciente";

function leerUltimoPaciente(): string | null {
  try {
    return localStorage.getItem(ULTIMO_PACIENTE_KEY);
  } catch {
    return null;
  }
}

function guardarUltimoPaciente(id: string) {
  try {
    localStorage.setItem(ULTIMO_PACIENTE_KEY, id);
  } catch {
    // Sin storage (modo privado, bloqueado): el switcher funciona igual.
  }
}

/** Header fijo de las páginas con sesión y consentimiento vigente. */
export function AppHeader() {
  const { signOut } = useAuth();
  const pacientes = usePatients();
  const navigate = useNavigate();
  const idEnRuta = useMatch("/patients/:id")?.params.id;

  // Visitar un paciente cuenta como seleccionarlo.
  useEffect(() => {
    if (idEnRuta && idEnRuta !== "new") guardarUltimoPaciente(idEnRuta);
  }, [idEnRuta]);

  const candidato = idEnRuta ?? leerUltimoPaciente();
  // Si el guardado ya no está en la lista (otro usuario, paciente borrado), se ignora.
  const seleccionado =
    candidato && pacientes.data?.some((p) => p.id === candidato) ? candidato : "";

  function onCambiarPaciente(id: string) {
    if (!id) return;
    guardarUltimoPaciente(id);
    navigate(`/patients/${id}`);
  }

  return (
    <header className={s.header}>
      <div className={`container ${s.headerInner}`}>
        <Link to="/" className={s.brand}>
          <LogoMark className={s.brandMark} />
          Cuidadores
        </Link>

        <div className={s.switcher}>
          {pacientes.isLoading && <span className="muted small">Cargando pacientes…</span>}
          {pacientes.error && (
            <span className="field-error">No se pudieron cargar los pacientes</span>
          )}
          {pacientes.data && pacientes.data.length > 0 && (
            <>
              <div className={s.desktopOnly}>
                <select
                  aria-label="Cambiar de paciente"
                  value={seleccionado}
                  onChange={(e) => onCambiarPaciente(e.target.value)}
                  className={`input ${s.switcherSelect}`}
                >
                  <option value="" disabled>
                    Elegir paciente…
                  </option>
                  {pacientes.data.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className={s.mobileOnly}>
                <SwitcherMenu
                  pacientes={pacientes.data}
                  seleccionado={seleccionado}
                  onElegir={onCambiarPaciente}
                />
              </div>
            </>
          )}
        </div>

        <nav className={s.nav} aria-label="Cuenta">
          <NavLink
            to="/me"
            className={({ isActive }) =>
              `btn btn-ghost ${isActive ? s.navLinkActive : ""}`
            }
          >
            Mi perfil
          </NavLink>
          <button onClick={() => signOut()} className="btn btn-ghost">
            <span className={s.longLabel}>Cerrar sesión</span>
            <span className={s.shortLabel}>Salir</span>
          </button>
        </nav>
      </div>
    </header>
  );
}

/** Switcher móvil: botón que abre una lista simple de pacientes. */
function SwitcherMenu({
  pacientes,
  seleccionado,
  onElegir,
}: {
  pacientes: Schemas["Patient"][];
  seleccionado: string;
  onElegir: (id: string) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const boton = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const actual = pacientes.find((p) => p.id === seleccionado);

  // Cerrar con Escape o al tocar fuera del menú.
  useEffect(() => {
    if (!abierto) return;
    function onPointer(e: PointerEvent) {
      if (!raiz.current?.contains(e.target as Node)) setAbierto(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setAbierto(false);
        boton.current?.focus();
      }
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [abierto]);

  return (
    <div ref={raiz}>
      <button
        ref={boton}
        type="button"
        className={`btn ${s.switcherButton}`}
        aria-expanded={abierto}
        aria-controls={menuId}
        onClick={() => setAbierto((v) => !v)}
      >
        <span>{actual ? actual.nombre : "Elegir paciente"}</span>
        <ChevronIcon />
      </button>
      {abierto && (
        <ul id={menuId} className={`list-reset ${s.switcherMenu}`} aria-label="Pacientes">
          {pacientes.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className={`btn btn-ghost ${s.switcherOption}`}
                aria-current={p.id === seleccionado}
                onClick={() => {
                  setAbierto(false);
                  onElegir(p.id);
                }}
              >
                {p.nombre}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ChevronIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true">
      <path
        d="M5 7.5l5 5 5-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
