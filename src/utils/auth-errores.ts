// Supabase Auth responde en inglés; traducimos los casos frecuentes para que
// el mensaje sea claro y accionable. Lo desconocido cae a un genérico.
const TRADUCCIONES: [RegExp, string][] = [
  [/invalid login credentials/i, "Correo o contraseña incorrectos."],
  [/email not confirmed/i, "Confirma tu correo antes de entrar: revisa tu bandeja de entrada."],
  [/user already registered/i, "Ya existe una cuenta con ese correo. Prueba entrar."],
  [/password should be at least/i, "La contraseña es muy corta: usa al menos 8 caracteres."],
  [/unable to validate email|invalid email/i, "Ese correo no parece válido."],
  [/rate limit|too many requests/i, "Demasiados intentos. Espera un minuto y vuelve a probar."],
  [/failed to fetch|network/i, "No hay conexión. Revisa tu internet y reintenta."],
];

export function mensajeAuth(err: unknown): string {
  const original = err instanceof Error ? err.message : "";
  for (const [patron, mensaje] of TRADUCCIONES) {
    if (patron.test(original)) return mensaje;
  }
  return "No pudimos completar la acción. Intenta de nuevo en unos segundos.";
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validarEmail(email: string): string | null {
  if (!email.trim()) return "Ingresa tu correo.";
  if (!EMAIL_RE.test(email.trim())) return "Revisa el correo: falta algo (ej: nombre@correo.cl).";
  return null;
}
