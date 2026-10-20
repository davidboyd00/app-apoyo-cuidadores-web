import { Link } from "react-router-dom";

import { useAuth } from "../providers/auth-provider";

/** Header común de las páginas con sesión y consentimiento vigente. */
export function AppHeader() {
  const { session, signOut } = useAuth();

  return (
    <header style={styles.bar}>
      <Link to="/" style={styles.brand}>
        Cuidadores
      </Link>
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
  link: { color: "#0A84FF", textDecoration: "none", fontWeight: 500 },
  secondary: {
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid #ccc",
    background: "#fff",
    cursor: "pointer",
  },
};
