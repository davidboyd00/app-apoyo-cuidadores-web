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
      <main className="container page stack">
        <h1>Cuenta creada</h1>
        <p>Revisa tu correo para confirmar la cuenta antes de iniciar sesión.</p>
        <Link to="/sign-in">Volver a entrar</Link>
      </main>
    );
  }

  return (
    <main className="container page stack">
      <h1>Crear cuenta</h1>
      <p className="muted">
        Al entrar te vamos a pedir aceptar la política de privacidad.
      </p>

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
          placeholder="contraseña (mínimo 8)"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="input"
        />
        {error && <p className="field-error" role="alert">{error}</p>}
        <button type="submit" disabled={loading} className="btn btn-primary">
          {loading ? "Creando…" : "Registrarme"}
        </button>
      </form>

      <p>
        ¿Ya tienes cuenta? <Link to="/sign-in">Entrar</Link>
      </p>
    </main>
  );
}

