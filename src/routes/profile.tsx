import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";

import { AppShell } from "../components/app-shell";
import { FormField } from "../components/form-field";
import {
  useConsent,
  useEliminarCuenta,
  useExportarDatos,
  useProfile,
  useUpdateProfile,
} from "../hooks/use-api";
import { useTituloPagina } from "../hooks/use-titulo-pagina";
import { ApiError, type Schemas } from "../lib/api";
import { vaciarOutbox } from "../lib/outbox";
import { supabase } from "../lib/supabase";
import { useAuth } from "../providers/auth-provider";
import s from "../styles/members.module.css";
import sec from "../styles/secciones.module.css";
import { fechaCompleta } from "../utils/bitacora";
import { mensajeError } from "../utils/errores";

export default function ProfilePage() {
  useTituloPagina("Mi perfil");
  const perfil = useProfile();

  return (
    <AppShell>
      <div className="stack-sm">
        <h1>Mi perfil</h1>
        <p className="muted">Tu nombre es lo que ve tu familia en la bitácora.</p>
      </div>

      {perfil.isLoading && (
        <div className={`skeleton ${s.profileCard} ${s.skeletonRow}`} aria-busy="true" />
      )}
      {perfil.error && (
        <p className="alert" role="alert">
          {mensajeError(perfil.error)}
        </p>
      )}
      {perfil.data && <ProfileForm key={perfil.data.id} perfil={perfil.data} />}
      <TusDatos />
      <EliminarCuenta />
    </AppShell>
  );
}

function ProfileForm({ perfil }: { perfil: Schemas["Profile"] }) {
  const guardar = useUpdateProfile();
  const { session } = useAuth();
  const [nombre, setNombre] = useState(perfil.nombre ?? "");
  const [telefono, setTelefono] = useState(perfil.telefono ?? "");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    // Vacío = null: el backend guarda "sin dato" en vez de un string vacío.
    guardar.mutate({
      nombre: nombre.trim() || null,
      telefono: telefono.trim() || null,
    });
  }

  return (
    <form onSubmit={onSubmit} className={`card stack ${s.profileCard}`} noValidate>
      <div className={s.readonly}>
        <span className="field-label">Correo</span>
        <span className="muted">{session?.user.email}</span>
      </div>

      <FormField label="Nombre" hint="Como te conoce tu familia.">
        {(props) => (
          <input
            {...props}
            value={nombre}
            onChange={(e) => {
              setNombre(e.target.value);
              guardar.reset();
            }}
            placeholder="Ej: María Pérez"
            autoComplete="name"
            className="input"
          />
        )}
      </FormField>

      <FormField label="Teléfono (opcional)">
        {(props) => (
          <input
            {...props}
            type="tel"
            value={telefono}
            onChange={(e) => {
              setTelefono(e.target.value);
              guardar.reset();
            }}
            placeholder="+56 9 1234 5678"
            autoComplete="tel"
            className="input"
          />
        )}
      </FormField>

      {guardar.isError && (
        <p className="alert" role="alert">
          {mensajeError(guardar.error)}
        </p>
      )}

      <div className={s.status}>
        <button type="submit" disabled={guardar.isPending} className="btn btn-primary">
          {guardar.isPending ? "Guardando…" : "Guardar"}
        </button>
        {/* La región aria-live existe siempre; solo cambia su contenido. */}
        <p aria-live="polite" className={guardar.isSuccess ? "badge badge-success" : undefined}>
          {guardar.isSuccess && "Guardado ✓"}
        </p>
      </div>
    </form>
  );
}

/** Derechos de acceso y portabilidad (Ley 21.719): descarga de todo lo que el
 * sistema tiene de la persona, y la versión de la política que aceptó. */
function TusDatos() {
  const exportar = useExportarDatos();
  const consentimiento = useConsent();

  function descargar() {
    exportar.mutate(undefined, {
      onSuccess: (datos) => {
        const blob = new Blob([JSON.stringify(datos, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `mis-datos-cuidadores-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
      },
    });
  }

  return (
    <section className={`card stack ${s.profileCard}`} aria-labelledby="titulo-datos">
      <h2 id="titulo-datos">Tus datos</h2>
      <p className="muted">
        Puedes descargar todo lo que guardamos sobre ti: tus registros (con sus correcciones), tus
        preguntas al asistente, tus turnos y los grupos de cuidado en que participas.
      </p>
      {consentimiento.data?.aceptada_en && (
        <p className="small">
          Aceptaste la política de privacidad (versión {consentimiento.data.version_vigente}) el{" "}
          {fechaCompleta(consentimiento.data.aceptada_en)}. <Link to="/consent">Ver la política</Link>
        </p>
      )}
      <div className="row">
        <button type="button" className="btn" onClick={descargar} disabled={exportar.isPending}>
          {exportar.isPending ? "Preparando…" : "Descargar mis datos (JSON)"}
        </button>
        <span aria-live="polite" className={exportar.isSuccess ? "badge badge-success" : undefined}>
          {exportar.isSuccess && "Descargado ✓"}
        </span>
      </div>
      {exportar.isError && (
        <p className="alert" role="alert">
          {mensajeError(exportar.error)}
        </p>
      )}
    </section>
  );
}

const PALABRA_CONFIRMACION = "ELIMINAR";

/** Borra la sesión de Supabase guardada en este navegador (sb-<proyecto>-auth-token). */
function borrarSesionLocal() {
  try {
    for (const clave of Object.keys(localStorage)) {
      if (/^sb-.+-auth-token$/.test(clave)) localStorage.removeItem(clave);
    }
  } catch {
    // sin storage: no hay sesión persistida que borrar
  }
}

/** Derecho de supresión (Ley 21.719). Irreversible: se pide escribir la palabra. */
function EliminarCuenta() {
  const eliminar = useEliminarCuenta();
  const [confirmacion, setConfirmacion] = useState("");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (confirmacion.trim().toUpperCase() !== PALABRA_CONFIRMACION) return;
    eliminar.mutate(undefined, {
      onSuccess: async () => {
        vaciarOutbox();
        // La cuenta ya no existe: si Supabase no puede cerrar la sesión en el
        // servidor, igual se borra la de este navegador.
        const { error } = await supabase.auth.signOut({ scope: "local" }).catch((e) => ({ error: e }));
        if (error) borrarSesionLocal();
        // Recarga completa: no queda en memoria ningún dato de la cuenta.
        window.location.assign("/sign-in");
      },
    });
  }

  const unicoAdmin = eliminar.error instanceof ApiError && eliminar.error.status === 409;

  return (
    <form
      onSubmit={onSubmit}
      className={`card stack ${s.profileCard} ${sec.zonaPeligro}`}
      aria-labelledby="titulo-eliminar"
    >
      <h2 id="titulo-eliminar">Eliminar mi cuenta</h2>
      <ul className="small">
        <li>Lo que escribiste en las bitácoras se conserva para tu familia, sin tu nombre.</li>
        <li>Sales de todos los grupos de cuidado y se eliminan tus turnos.</li>
        <li>Si eras la única persona en un grupo, ese grupo se elimina.</li>
        <li>No se puede deshacer.</li>
      </ul>
      <label className="field">
        <span className="field-label">
          Escribe {PALABRA_CONFIRMACION} para confirmar
        </span>
        <input
          className="input"
          value={confirmacion}
          onChange={(e) => setConfirmacion(e.target.value)}
          autoComplete="off"
        />
      </label>
      <div>
        <button
          type="submit"
          className="btn btn-danger"
          disabled={
            eliminar.isPending || confirmacion.trim().toUpperCase() !== PALABRA_CONFIRMACION
          }
        >
          {eliminar.isPending ? "Eliminando…" : "Eliminar mi cuenta"}
        </button>
      </div>
      {eliminar.isError && (
        <p className="alert" role="alert">
          {unicoAdmin
            ? mensajeError(eliminar.error)
            : mensajeError(eliminar.error, "No se pudo eliminar la cuenta. Intenta de nuevo.")}
        </p>
      )}
    </form>
  );
}
