import { useEffect } from "react";
import { Link, useMatch, useNavigate } from "react-router-dom";

import { usePatients } from "../hooks/use-api";
import { useAuth } from "../providers/auth-provider";

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

/** Header común de las páginas con sesión y consentimiento vigente. */
export function AppHeader() {
  const { session, signOut } = useAuth();
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
    <header className="row-between">
      <div className="row">
        <Link to="/">
          Cuidadores
        </Link>
        {pacientes.isLoading && <span className="muted small">Cargando pacientes…</span>}
        {pacientes.error && (
          <span className="field-error">No se pudieron cargar los pacientes</span>
        )}
        {pacientes.data && pacientes.data.length > 0 && (
          <select
            aria-label="Cambiar de paciente"
            value={seleccionado}
            onChange={(e) => onCambiarPaciente(e.target.value)}
            className="input"
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
        )}
      </div>
      <div className="row">
        <span className="muted small">{session?.user?.email}</span>
        <Link to="/me">
          Mi perfil
        </Link>
        <button onClick={() => signOut()} className="btn">
          Cerrar sesión
        </button>
      </div>
    </header>
  );
}

