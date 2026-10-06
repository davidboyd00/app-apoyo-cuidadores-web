import { useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";

import { useAuth } from "../providers/auth-provider";

export default function SignUpPage() {
  const { session, signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState(false);

  if (session) return <Navigate to="/" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Contraseña débil: mínimo 8 caracteres.");
      return;
    }
    setLoading(true);
    try {
      await signUp(email.trim(), password);
      setListo(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  if (listo) {
    return (
      <main style={styles.wrap}>
        <h1>Cuenta creada</h1>
        <p>Revisa tu correo para confirmar la cuenta antes de iniciar sesión.</p>
        <Link to="/sign-in">Volver a entrar</Link>
      </main>
    );
  }

  return (
    <main style={styles.wrap}>
      <h1>Crear cuenta</h1>
      <p style={styles.muted}>
        Al entrar te vamos a pedir aceptar la política de privacidad.
      </p>

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
          placeholder="contraseña (mínimo 8)"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={styles.input}
        />
        {error && <div style={styles.error}>{error}</div>}
        <button type="submit" disabled={loading} style={styles.primary}>
          {loading ? "Creando…" : "Registrarme"}
        </button>
      </form>

      <p>
        ¿Ya tienes cuenta? <Link to="/sign-in">Entrar</Link>
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
