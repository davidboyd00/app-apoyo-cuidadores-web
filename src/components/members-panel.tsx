import { useState, type FormEvent } from "react";

import { useInviteMember, useMembers, useRemoveMember } from "../hooks/use-api";
import type { Schemas } from "../lib/api";

type Rol = Schemas["MemberInvite"]["role"];

const ROL_LABELS: Record<Rol, string> = {
  admin: "Admin",
  caregiver: "Cuidador/a",
  viewer: "Solo lectura",
};

/**
 * Red de cuidado del paciente: listar, invitar por email y quitar miembros.
 * No ocultamos acciones según el rol: la autorización vive en RLS y, si el
 * usuario no puede, mostramos el mensaje que devuelve el backend.
 */
export function MembersPanel({ patientId }: { patientId: string }) {
  const miembros = useMembers(patientId);
  const invitar = useInviteMember(patientId);
  const quitar = useRemoveMember(patientId);

  const [email, setEmail] = useState("");
  const [rol, setRol] = useState<Rol>("caregiver");
  const [errorQuitar, setErrorQuitar] = useState<string | null>(null);

  async function onInvitar(e: FormEvent) {
    e.preventDefault();
    try {
      await invitar.mutateAsync({ email: email.trim(), role: rol });
      setEmail("");
      setRol("caregiver");
    } catch {
      // El error queda en `invitar.error` y se muestra bajo el formulario.
    }
  }

  async function onQuitar(m: Schemas["CareMember"]) {
    const nombre = m.nombre || m.email;
    if (!window.confirm(`¿Quitar a ${nombre} de la red de cuidado?`)) return;
    setErrorQuitar(null);
    try {
      await quitar.mutateAsync(m.user_id);
    } catch (err) {
      setErrorQuitar(err instanceof Error ? err.message : "No se pudo quitar al miembro.");
    }
  }

  return (
    <div style={styles.wrap}>
      {miembros.isLoading && <p style={styles.muted}>Cargando miembros…</p>}
      {miembros.error && (
        <p style={styles.error}>
          {miembros.error instanceof Error ? miembros.error.message : "Error"}
        </p>
      )}
      {miembros.data && miembros.data.length === 0 && (
        <p style={styles.muted}>Sin miembros todavía.</p>
      )}

      <ul style={styles.list}>
        {miembros.data?.map((m) => (
          <li key={m.user_id} style={styles.item}>
            <div>
              <strong>{m.nombre || m.email}</strong>
              {m.nombre && <span style={styles.muted}> · {m.email}</span>}
              <div style={styles.meta}>
                <span style={styles.rolBadge}>{ROL_LABELS[m.role]}</span>
                <span style={styles.muted}>
                  Desde {new Date(m.joined_at).toLocaleDateString("es-CL")}
                </span>
              </div>
            </div>
            <button
              onClick={() => onQuitar(m)}
              disabled={quitar.isPending && quitar.variables === m.user_id}
              style={styles.danger}
            >
              {quitar.isPending && quitar.variables === m.user_id ? "Quitando…" : "Quitar"}
            </button>
          </li>
        ))}
      </ul>
      {errorQuitar && <p style={styles.error}>{errorQuitar}</p>}

      <form onSubmit={onInvitar} style={styles.form}>
        <h3 style={{ margin: 0, fontSize: 15 }}>Invitar a un familiar</h3>
        <div style={styles.row}>
          <input
            type="email"
            required
            placeholder="correo@ejemplo.cl"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ ...styles.input, flex: 2 }}
          />
          <select
            value={rol}
            onChange={(e) => setRol(e.target.value as Rol)}
            style={styles.input}
          >
            {Object.entries(ROL_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <p style={styles.hint}>La persona debe tener una cuenta creada con ese correo.</p>
        {invitar.isError && (
          <p style={styles.error}>
            {invitar.error instanceof Error ? invitar.error.message : "Error"}
          </p>
        )}
        <button
          type="submit"
          disabled={invitar.isPending || !email.trim()}
          style={styles.primary}
        >
          {invitar.isPending ? "Invitando…" : "Invitar"}
        </button>
      </form>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: { display: "flex", flexDirection: "column", gap: 12 },
  muted: { color: "#666", margin: 0 },
  hint: { color: "#666", margin: 0, fontSize: 13 },
  list: { listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 },
  item: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 8,
    border: "1px solid #eee",
    background: "#fafafa",
  },
  meta: { display: "flex", gap: 10, alignItems: "center", marginTop: 4, fontSize: 13 },
  rolBadge: {
    padding: "2px 8px",
    borderRadius: 12,
    background: "#0A84FF22",
    color: "#0A84FF",
    fontWeight: 600,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    padding: 16,
    borderRadius: 8,
    border: "1px solid #e5e5e5",
    background: "#fff",
  },
  row: { display: "flex", gap: 8, flexWrap: "wrap" },
  input: {
    padding: 10,
    fontSize: 14,
    borderRadius: 6,
    border: "1px solid #ccc",
    fontFamily: "inherit",
    flex: 1,
    minWidth: 140,
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
  danger: {
    padding: "6px 12px",
    borderRadius: 6,
    border: "1px solid #e5b5b5",
    background: "#fff",
    color: "#c00",
    cursor: "pointer",
  },
  error: { color: "#c00", fontSize: 13, margin: 0 },
};
