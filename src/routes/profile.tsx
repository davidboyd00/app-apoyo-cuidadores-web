import { useState, type FormEvent } from "react";

import { AppHeader } from "../components/app-header";
import { useProfile, useUpdateProfile } from "../hooks/use-api";
import type { Schemas } from "../lib/api";

export default function ProfilePage() {
  const perfil = useProfile();

  return (
    <main className="container page stack">
      <AppHeader />
      <h1>Mi perfil</h1>
      <p className="muted">
        Tu nombre es lo que ve tu red de cuidado en la bitácora.
      </p>

      {perfil.isLoading && <p>Cargando perfil…</p>}
      {perfil.error && (
        <p className="alert" role="alert">
          {perfil.error instanceof Error ? perfil.error.message : "Error"}
        </p>
      )}
      {perfil.data && <ProfileForm key={perfil.data.id} perfil={perfil.data} />}
    </main>
  );
}

function ProfileForm({ perfil }: { perfil: Schemas["Profile"] }) {
  const guardar = useUpdateProfile();
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
    <form onSubmit={onSubmit} className="card stack">
      <label className="field">
        <span className="field-label">Nombre</span>
        <input
          value={nombre}
          onChange={(e) => {
            setNombre(e.target.value);
            guardar.reset();
          }}
          placeholder="Ej: María Pérez"
          className="input"
        />
      </label>
      <label className="field">
        <span className="field-label">Teléfono</span>
        <input
          type="tel"
          value={telefono}
          onChange={(e) => {
            setTelefono(e.target.value);
            guardar.reset();
          }}
          placeholder="+56 9 1234 5678"
          className="input"
        />
      </label>

      {guardar.isError && (
        <p className="alert" role="alert">
          {guardar.error instanceof Error ? guardar.error.message : "Error"}
        </p>
      )}
      {guardar.isSuccess && <p className="alert alert-success">Guardado</p>}

      <button type="submit" disabled={guardar.isPending} className="btn btn-primary">
        {guardar.isPending ? "Guardando…" : "Guardar"}
      </button>
    </form>
  );
}

