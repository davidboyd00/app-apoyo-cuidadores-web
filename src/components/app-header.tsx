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
    <header style={styles.bar}>
      <div style={styles.actions}>
        <Link to="/" style={styles.brand}>
          Cuidadores
        </Link>
        {pacientes.isLoading && <span style={styles.muted}>Cargando pacientes…</span>}
        {pacientes.error && (
          <span style={styles.error}>No se pudieron cargar los pacientes</span>
        )}
        {pacientes.data && pacientes.data.length > 0 && (
          <select
            aria-label="Cambiar de paciente"
            value={seleccionado}
            onChange={(e) => onCambiarPaciente(e.target.value)}
            style={styles.select}
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
      <div style={styles.actions}>
        <span style={styles.muted}>{session?.user?.email}</span>
        <Link to="/me" style={styles.link}>
          Mi perfil
        </Link>
        <button onClick={() => signOut()} style={styles.secondary}>
          Cerrar sesión
        </button>
      </div>
    </header>
  );
}

const styles: Record<string, React.CSSProperties> = {
  bar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
    paddingBottom: 16,
    marginBottom: 20,
    borderBottom: "1px solid #eee",
  },
  brand: { fontWeight: 700, fontSize: 18, color: "inherit", textDecoration: "none" },
  actions: { display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" },
  muted: { color: "#666", fontSize: 14 },
  error: { color: "#c00", fontSize: 14 },
  select: {
    padding: 8,
    fontSize: 14,
    borderRadius: 6,
    border: "1px solid #ccc",
    fontFamily: "inherit",
    maxWidth: 220,
  },
  link: { color: "#0A84FF", textDecoration: "none", fontWeight: 500 },
  secondary: {
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid #ccc",
    background: "#fff",
    cursor: "pointer",
  },
};
