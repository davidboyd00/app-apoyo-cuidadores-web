import { useState, type FormEvent } from "react";

import { useInviteMember, useMembers, useRemoveMember } from "../hooks/use-api";
import type { Schemas } from "../lib/api";
import { useAuth } from "../providers/auth-provider";
import s from "../styles/members.module.css";
import { validarEmail } from "../utils/auth-errores";
import { Avatar } from "./avatar";
import { FormField } from "./form-field";

type Rol = Schemas["MemberInvite"]["role"];

const ROL_LABELS: Record<Rol, string> = {
  admin: "Administrador/a",
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
  const { session } = useAuth();

  const [email, setEmail] = useState("");
  const [rol, setRol] = useState<Rol>("caregiver");
  const [errorEmail, setErrorEmail] = useState<string | null>(null);
  const [invitado, setInvitado] = useState<string | null>(null);
  const [errorQuitar, setErrorQuitar] = useState<string | null>(null);

  async function onInvitar(e: FormEvent) {
    e.preventDefault();
    setInvitado(null);
    const err = validarEmail(email);
    setErrorEmail(err);
    if (err) return;
    try {
      const nuevo = await invitar.mutateAsync({ email: email.trim(), role: rol });
      setInvitado(nuevo.nombre || nuevo.email);
      setEmail("");
      setRol("caregiver");
    } catch (error) {
      // 404 sin cuenta / 403 no admin: el detail del backend va bajo el correo.
      setErrorEmail(error instanceof Error ? error.message : "No se pudo invitar.");
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
      <div className={`card ${s.list}`}>
        {miembros.isLoading && (
          <div aria-busy="true">
            {[0, 1].map((i) => (
              <div key={i} className={`skeleton ${s.skeletonRow}`} />
            ))}
            <span className="visually-hidden">Cargando miembros…</span>
          </div>
        )}
        {miembros.error && (
          <p className={`alert ${s.member}`} role="alert">
            {miembros.error instanceof Error ? miembros.error.message : "Error"}
          </p>
        )}
        {miembros.data && miembros.data.length === 0 && (
          <p className={`muted ${s.member}`}>Sin miembros todavía.</p>
        )}

        {miembros.data && miembros.data.length > 0 && (
          <ul className="list-reset">
            {miembros.data.map((m) => {
              const nombre = m.nombre || m.email;
              const soyYo = m.user_id === session?.user.id;
              return (
                <li key={m.user_id} className={s.member}>
                  <div className={s.who}>
                    <Avatar nombre={nombre} clave={m.user_id} />
                    <div className={s.whoText}>
                      <strong>
                        {nombre}
                        {soyYo && " (tú)"}
                      </strong>
                      {m.nombre && <span className={`muted small ${s.email}`}>{m.email}</span>}
                    </div>
                  </div>
                  <div className={s.meta}>
                    <span className={`badge ${m.role === "admin" ? "" : s.rolNeutral}`}>
                      {ROL_LABELS[m.role]}
                    </span>
                    <span className="muted small">
                      desde {new Date(m.joined_at).toLocaleDateString("es-CL")}
                    </span>
                    <button
                      onClick={() => onQuitar(m)}
                      disabled={quitar.isPending && quitar.variables === m.user_id}
                      className="btn btn-ghost btn-danger"
                      aria-label={`Quitar a ${nombre} de la red`}
                    >
                      {quitar.isPending && quitar.variables === m.user_id ? "Quitando…" : "Quitar"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {errorQuitar && (
        <p className="alert" role="alert">
          {errorQuitar}
        </p>
      )}

      <form onSubmit={onInvitar} className="card stack" noValidate aria-labelledby="titulo-invitar">
        <div className="stack-sm">
          <h3 id="titulo-invitar">Invitar a un familiar</h3>
          <p className="muted small">
            La persona debe haber creado su cuenta con ese correo.
          </p>
        </div>
        <div className={s.inviteRow}>
          <FormField label="Correo electrónico" error={errorEmail}>
            {(props) => (
              <input
                {...props}
                type="email"
                inputMode="email"
                autoComplete="off"
                placeholder="familiar@correo.cl"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
              />
            )}
          </FormField>
          <FormField label="Rol">
            {(props) => (
              <select
                {...props}
                value={rol}
                onChange={(e) => setRol(e.target.value as Rol)}
                className="input"
              >
                {(Object.keys(ROL_LABELS) as Rol[]).map((r) => (
                  <option key={r} value={r}>
                    {ROL_LABELS[r]}
                  </option>
                ))}
              </select>
            )}
          </FormField>
        </div>
        <div className={s.status}>
          <button type="submit" disabled={invitar.isPending} className="btn btn-primary">
            {invitar.isPending ? "Invitando…" : "Invitar"}
          </button>
          <p className="muted" aria-live="polite">
            {invitado && `Listo: ${invitado} ya es parte de la red.`}
          </p>
        </div>
      </form>
    </div>
  );
}
