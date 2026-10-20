import { useState, type FormEvent } from "react";

import { AppHeader } from "../components/app-header";
import { useProfile, useUpdateProfile } from "../hooks/use-api";
import type { Schemas } from "../lib/api";

export default function ProfilePage() {
  const perfil = useProfile();

  return (
    <main style={styles.wrap}>
      <AppHeader />
      <h1 style={{ marginTop: 0 }}>Mi perfil</h1>
      <p style={styles.muted}>
        Tu nombre es lo que ve tu red de cuidado en la bitácora.
      </p>

      {perfil.isLoading && <p>Cargando perfil…</p>}
      {perfil.error && (
        <div style={styles.error}>
          {perfil.error instanceof Error ? perfil.error.message : "Error"}
        </div>
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
    <form onSubmit={onSubmit} style={styles.form}>
      <label style={styles.label}>
        Nombre
        <input
          value={nombre}
          onChange={(e) => {
            setNombre(e.target.value);
            guardar.reset();
          }}
          placeholder="Ej: María Pérez"
          style={styles.input}
        />
      </label>
      <label style={styles.label}>
        Teléfono
        <input
          type="tel"
          value={telefono}
          onChange={(e) => {
            setTelefono(e.target.value);
            guardar.reset();
          }}
          placeholder="+56 9 1234 5678"
          style={styles.input}
        />
      </label>

      {guardar.isError && (
        <div style={styles.error}>
          {guardar.error instanceof Error ? guardar.error.message : "Error"}
        </div>
      )}
      {guardar.isSuccess && <div style={styles.ok}>Guardado</div>}

      <button type="submit" disabled={guardar.isPending} style={styles.primary}>
        {guardar.isPending ? "Guardando…" : "Guardar"}
      </button>
    </form>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: { maxWidth: 760, margin: "40px auto", padding: 24, fontFamily: "system-ui" },
  muted: { color: "#666", marginTop: 0 },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
    padding: 16,
    borderRadius: 8,
    border: "1px solid #e5e5e5",
    background: "#fff",
    maxWidth: 420,
  },
  label: { display: "flex", flexDirection: "column", gap: 6, fontSize: 14, fontWeight: 500 },
  input: {
    padding: 10,
    fontSize: 14,
    borderRadius: 6,
    border: "1px solid #ccc",
    fontFamily: "inherit",
    fontWeight: 400,
  },
  primary: {
    padding: "10px 14px",
    borderRadius: 6,
    border: "none",
    background: "#0A84FF",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 600,
    alignSelf: "flex-start",
  },
  ok: { color: "#1a7f37", fontSize: 14 },
  error: { padding: 12, color: "#c00", background: "#fff5f5", borderRadius: 8 },
};
