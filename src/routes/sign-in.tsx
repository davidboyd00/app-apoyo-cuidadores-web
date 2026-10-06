import { useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";

import { useAuth } from "../providers/auth-provider";

export default function SignInPage() {
  const { session, signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (session) return <Navigate to="/" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signIn(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={styles.wrap}>
      <h1>Entrar</h1>
      <p style={styles.muted}>Usa tu correo del grupo de cuidado.</p>

      <form onSubmit={onSubmit} style={styles.form}>
        <input
          type="email"
          placeholder="correo@ejemplo.cl"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={styles.input}
        />
        <input
          type="password"
          placeholder="contraseña"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={styles.input}
        />
        {error && <div style={styles.error}>{error}</div>}
        <button type="submit" disabled={loading} style={styles.primary}>
          {loading ? "Entrando…" : "Entrar"}
        </button>
      </form>

      <p>
        ¿No tienes cuenta? <Link to="/sign-up">Regístrate</Link>
      </p>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: { maxWidth: 400, margin: "80px auto", padding: 24, fontFamily: "system-ui" },
  muted: { color: "#666" },
  form: { display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 },
  input: { padding: 10, fontSize: 16, borderRadius: 8, border: "1px solid #ccc" },
  primary: {
    padding: 12,
    fontSize: 16,
    borderRadius: 8,
    border: "none",
    background: "#0A84FF",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 600,
  },
  error: { color: "#c00", fontSize: 14 },
};
