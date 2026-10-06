import { useAuth } from "../providers/auth-provider";

export default function HomePage() {
  const { session, signOut } = useAuth();
  const email = session?.user?.email ?? "";

  return (
    <main style={styles.wrap}>
      <header style={styles.header}>
        <h1 style={{ margin: 0 }}>Hola</h1>
        <button onClick={() => signOut()} style={styles.logout}>
          Cerrar sesión
        </button>
      </header>
      <p style={styles.muted}>{email}</p>

      <section style={styles.card}>
        <h2 style={{ marginTop: 0 }}>Entrega del 10/10</h2>
        <p>
          Autenticación lista. Próximo: pacientes, bitácora y gestión de la red
          de cuidado (ver <code>docs/ROADMAP.md</code>).
        </p>
      </section>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: { maxWidth: 720, margin: "40px auto", padding: 24, fontFamily: "system-ui" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  muted: { color: "#666" },
  card: {
    marginTop: 24,
    padding: 20,
    borderRadius: 12,
    border: "1px solid #eee",
    background: "#fafafa",
  },
  logout: {
    padding: "8px 14px",
    borderRadius: 8,
    border: "1px solid #ccc",
    background: "#fff",
    cursor: "pointer",
  },
};
