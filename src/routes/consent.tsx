import { useAcceptConsent, useConsent } from "../hooks/use-api";
import { useAuth } from "../providers/auth-provider";

export default function ConsentPage() {
  const { data, isLoading, error } = useConsent();
  const aceptar = useAcceptConsent();
  const { signOut } = useAuth();

  if (isLoading) return <div style={{ padding: 24 }}>Cargando política…</div>;

  if (error || !data) {
    return (
      <div style={{ padding: 24 }}>
        <h1>Error cargando la política</h1>
        <p>{error instanceof Error ? error.message : "Desconocido"}</p>
      </div>
    );
  }

  return (
    <main style={styles.wrap}>
      <h1>Política de privacidad</h1>
      <p style={styles.muted}>
        Versión vigente: <code>{data.version_vigente}</code>
      </p>

      <article style={styles.doc}>
        {/* El texto llega como markdown; en MVP lo mostramos plano con pre-wrap. */}
        <pre style={styles.pre}>{data.texto}</pre>
      </article>

      {aceptar.isError && (
        <div style={styles.error}>
          {aceptar.error instanceof Error ? aceptar.error.message : "Error"}
        </div>
      )}

      <div style={styles.actions}>
        <button onClick={() => signOut()} style={styles.secondary}>
          No acepto, salir
        </button>
        <button
          onClick={() => aceptar.mutate(data.version_vigente)}
          disabled={aceptar.isPending}
          style={styles.primary}
        >
          {aceptar.isPending ? "Guardando…" : "Acepto la política"}
        </button>
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: { maxWidth: 760, margin: "40px auto", padding: 24, fontFamily: "system-ui" },
  muted: { color: "#666" },
  doc: {
    marginTop: 16,
    padding: 20,
    borderRadius: 8,
    border: "1px solid #eee",
    background: "#fafafa",
    maxHeight: 420,
    overflowY: "auto",
  },
  pre: {
    whiteSpace: "pre-wrap",
    wordWrap: "break-word",
    fontFamily: "inherit",
    margin: 0,
    fontSize: 14,
    lineHeight: 1.5,
  },
  actions: { marginTop: 20, display: "flex", gap: 12, justifyContent: "flex-end" },
  primary: {
    padding: "10px 16px",
    borderRadius: 8,
    border: "none",
    background: "#0A84FF",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 600,
  },
  secondary: {
    padding: "10px 16px",
    borderRadius: 8,
    border: "1px solid #ccc",
    background: "#fff",
    cursor: "pointer",
  },
  error: { marginTop: 12, color: "#c00", fontSize: 14 },
};
