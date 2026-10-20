import { useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";

import { AuthLayout } from "../components/auth-layout";
import { FormField } from "../components/form-field";
import { useTituloPagina } from "../hooks/use-titulo-pagina";
import { useAuth } from "../providers/auth-provider";
import { mensajeAuth, validarEmail } from "../utils/auth-errores";

export default function SignInPage() {
  useTituloPagina("Entrar");
  const { session, signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorEmail, setErrorEmail] = useState<string | null>(null);
  const [errorPassword, setErrorPassword] = useState<string | null>(null);

  if (session) return <Navigate to="/" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const eEmail = validarEmail(email);
    const ePass = password ? null : "Ingresa tu contraseña.";
    setErrorEmail(eEmail);
    setErrorPassword(ePass);
    if (eEmail || ePass) return;

    setLoading(true);
    try {
      await signIn(email.trim(), password);
    } catch (err) {
      // Error de credenciales: se muestra bajo la contraseña.
      setErrorPassword(mensajeAuth(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Entrar"
      subtitle="Un espacio compartido para que la familia registre y coordine el cuidado."
      footer={
        <>
          ¿No tienes cuenta? <Link to="/sign-up">Crear una cuenta</Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="stack" noValidate>
        <FormField label="Correo electrónico" error={errorEmail}>
          {(props) => (
            <input
              {...props}
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="nombre@correo.cl"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
            />
          )}
        </FormField>
        <FormField label="Contraseña" error={errorPassword}>
          {(props) => (
            <input
              {...props}
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
            />
          )}
        </FormField>
        <button type="submit" disabled={loading} className="btn btn-primary btn-block">
          {loading ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </AuthLayout>
  );
}
