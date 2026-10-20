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
    <main className="container page stack">
      <h1>Entrar</h1>
      <p className="muted">Usa tu correo del grupo de cuidado.</p>

      <form onSubmit={onSubmit} className="stack">
        <input
          type="email"
          placeholder="correo@ejemplo.cl"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="input"
        />
        <input
          type="password"
          placeholder="contraseña"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="input"
        />
        {error && <p className="field-error" role="alert">{error}</p>}
        <button type="submit" disabled={loading} className="btn btn-primary">
          {loading ? "Entrando…" : "Entrar"}
        </button>
      </form>

      <p>
        ¿No tienes cuenta? <Link to="/sign-up">Regístrate</Link>
      </p>
    </main>
  );
}

