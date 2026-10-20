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
    <div className="stack">
      {miembros.isLoading && <p className="muted">Cargando miembros…</p>}
      {miembros.error && (
        <p className="alert" role="alert">
          {miembros.error instanceof Error ? miembros.error.message : "Error"}
        </p>
      )}
      {miembros.data && miembros.data.length === 0 && (
        <p className="muted">Sin miembros todavía.</p>
      )}

      <ul className="list-reset stack-sm">
        {miembros.data?.map((m) => (
          <li key={m.user_id} className="card row-between">
            <div>
              <strong>{m.nombre || m.email}</strong>
              {m.nombre && <span className="muted"> · {m.email}</span>}
              <div className="row small">
                <span className="badge">{ROL_LABELS[m.role]}</span>
                <span className="muted">
                  Desde {new Date(m.joined_at).toLocaleDateString("es-CL")}
                </span>
              </div>
            </div>
            <button
              onClick={() => onQuitar(m)}
              disabled={quitar.isPending && quitar.variables === m.user_id}
              className="btn btn-ghost btn-danger"
            >
              {quitar.isPending && quitar.variables === m.user_id ? "Quitando…" : "Quitar"}
            </button>
          </li>
        ))}
      </ul>
      {errorQuitar && <p className="alert" role="alert">{errorQuitar}</p>}

      <form onSubmit={onInvitar} className="card stack-sm">
        <h3>Invitar a un familiar</h3>
        <div className="row">
          <input
            type="email"
            required
            placeholder="correo@ejemplo.cl"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
          />
          <select
            value={rol}
            onChange={(e) => setRol(e.target.value as Rol)}
            className="input"
          >
            {Object.entries(ROL_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <p className="muted small">La persona debe tener una cuenta creada con ese correo.</p>
        {invitar.isError && (
          <p className="field-error" role="alert">
            {invitar.error instanceof Error ? invitar.error.message : "Error"}
          </p>
        )}
        <button
          type="submit"
          disabled={invitar.isPending || !email.trim()}
          className="btn btn-primary"
        >
          {invitar.isPending ? "Invitando…" : "Invitar"}
        </button>
      </form>
    </div>
  );
}

