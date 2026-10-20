import { useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";

import { AuthLayout } from "../components/auth-layout";
import { FormField } from "../components/form-field";
import { useTituloPagina } from "../hooks/use-titulo-pagina";
import { useAuth } from "../providers/auth-provider";
import { mensajeAuth, validarEmail } from "../utils/auth-errores";

export default function SignUpPage() {
  useTituloPagina("Crear cuenta");
  const { session, signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorEmail, setErrorEmail] = useState<string | null>(null);
  const [errorPassword, setErrorPassword] = useState<string | null>(null);
  const [listo, setListo] = useState(false);

  if (session) return <Navigate to="/" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const eEmail = validarEmail(email);
    const ePass = password.length < 8 ? "Usa al menos 8 caracteres." : null;
    setErrorEmail(eEmail);
    setErrorPassword(ePass);
    if (eEmail || ePass) return;

    setLoading(true);
    try {
      await signUp(email.trim(), password);
      setListo(true);
    } catch (err) {
      const mensaje = mensajeAuth(err);
      // "ya existe" o "correo inválido" van bajo el correo; el resto, bajo la contraseña.
      if (/correo/i.test(mensaje)) setErrorEmail(mensaje);
      else setErrorPassword(mensaje);
    } finally {
      setLoading(false);
    }
  }

  if (listo) {
    return (
      <AuthLayout
        title="Revisa tu correo"
        subtitle={
          <>
            Te enviamos un enlace a <strong>{email.trim()}</strong> para confirmar la
            cuenta. Después de confirmarla, ya puedes entrar.
          </>
        }
      >
        <Link to="/sign-in" className="btn btn-primary btn-block">
          Ir a entrar
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Crear cuenta"
      subtitle="Registra y comparte con tu familia el día a día de la persona que cuidas."
      footer={
        <>
          ¿Ya tienes cuenta? <Link to="/sign-in">Entrar</Link>
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
        <FormField
          label="Contraseña"
          hint="Mínimo 8 caracteres."
          error={errorPassword}
        >
          {(props) => (
            <input
              {...props}
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
            />
          )}
        </FormField>
        <p className="muted small">
          Al entrar te pediremos aceptar la política de privacidad.
        </p>
        <button type="submit" disabled={loading} className="btn btn-primary btn-block">
          {loading ? "Creando cuenta…" : "Crear cuenta"}
        </button>
      </form>
    </AuthLayout>
  );
}
