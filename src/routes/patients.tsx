import { Link } from "react-router-dom";

import { usePatients } from "../hooks/use-api";
import { useAuth } from "../providers/auth-provider";

export default function PatientsPage() {
  const { data: pacientes, isLoading, error } = usePatients();
  const { session, signOut } = useAuth();

  return (
    <main style={styles.wrap}>
      <header style={styles.header}>
        <div>
          <h1 style={{ margin: 0 }}>Pacientes</h1>
          <p style={styles.muted}>{session?.user?.email}</p>
        </div>
        <div style={styles.headerActions}>
          <Link to="/patients/new" style={styles.primaryLink}>
            + Nuevo paciente
          </Link>
          <button onClick={() => signOut()} style={styles.secondary}>
            Cerrar sesión
          </button>
        </div>
      </header>

      {isLoading && <p>Cargando…</p>}
      {error && (
        <div style={styles.error}>
          {error instanceof Error ? error.message : "Error"}
        </div>
      )}

      {pacientes && pacientes.length === 0 && (
        <div style={styles.empty}>
          <p>Todavía no tienes pacientes en tu red de cuidado.</p>
          <p style={styles.muted}>
            Crea uno para empezar a registrar la bitácora.
          </p>
        </div>
      )}

      <ul style={styles.list}>
        {pacientes?.map((p) => (
          <li key={p.id} style={styles.item}>
            <Link to={`/patients/${p.id}`} style={styles.itemLink}>
              <strong>{p.nombre}</strong>
              {p.fecha_nacimiento && (
                <span style={styles.muted}>
                  &nbsp;· nacido {new Date(p.fecha_nacimiento).toLocaleDateString("es-CL")}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: { maxWidth: 760, margin: "40px auto", padding: 24, fontFamily: "system-ui" },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
    flexWrap: "wrap",
    marginBottom: 20,
  },
  headerActions: { display: "flex", gap: 8, alignItems: "center" },
  muted: { color: "#666", margin: 0 },
  primaryLink: {
    padding: "10px 14px",
    borderRadius: 8,
    background: "#0A84FF",
    color: "#fff",
    textDecoration: "none",
    fontWeight: 600,
  },
  secondary: {
    padding: "10px 14px",
    borderRadius: 8,
    border: "1px solid #ccc",
    background: "#fff",
    cursor: "pointer",
  },
  list: { listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 8 },
  item: {
    padding: 16,
    borderRadius: 8,
    border: "1px solid #eee",
    background: "#fafafa",
  },
  itemLink: { textDecoration: "none", color: "inherit", display: "block" },
  empty: {
    padding: 32,
    textAlign: "center",
    borderRadius: 12,
    border: "1px dashed #ccc",
    color: "#666",
    marginTop: 20,
  },
  error: { padding: 12, color: "#c00", background: "#fff5f5", borderRadius: 8, marginBottom: 16 },
};
