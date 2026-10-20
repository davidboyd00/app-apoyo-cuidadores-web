import { useState, type FormEvent } from "react";

import { AppShell } from "../components/app-shell";
import { FormField } from "../components/form-field";
import { useProfile, useUpdateProfile } from "../hooks/use-api";
import { useTituloPagina } from "../hooks/use-titulo-pagina";
import type { Schemas } from "../lib/api";
import { useAuth } from "../providers/auth-provider";
import s from "../styles/members.module.css";

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
          {perfil.error instanceof Error ? perfil.error.message : "Error"}
        </p>
      )}
      {perfil.data && <ProfileForm key={perfil.data.id} perfil={perfil.data} />}
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
          {guardar.error instanceof Error ? guardar.error.message : "Error"}
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
