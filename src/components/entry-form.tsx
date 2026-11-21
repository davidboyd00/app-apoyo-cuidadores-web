import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";

import { FormField } from "./form-field";
import type { Schemas } from "../lib/api";
import { registrarEntrada } from "../lib/sincronizacion";
import s from "../styles/patient-detail.module.css";
import { KINDS, type Kind } from "../utils/bitacora";
import { mensajeError } from "../utils/errores";

export type EntryValues = Pick<Schemas["Entry"], "kind" | "content" | "occurred_at"> & {
  // Solo en edición: motivo obligatorio de la corrección (queda en el historial).
  motivo?: string;
};

const MIN_MOTIVO = 3;

type Props = {
  patientId: string;
  // Modo edición: si vienen `initialValues` + `onSubmit`, el form no crea
  // una entrada nueva sino que entrega los valores al padre.
  initialValues?: EntryValues;
  onSubmit?: (valores: EntryValues) => Promise<unknown>;
  onCancel?: () => void;
};

export function EntryForm({ patientId, initialValues, onSubmit, onCancel }: Props) {
  const qc = useQueryClient();
  const editando = initialValues !== undefined;
  const grupoKind = useId();
  const idMotivo = useId();
  // Fecha original de la entrada en formato datetime-local (solo al editar).
  const [fechaInicial] = useState(() =>
    initialValues ? isoLocal(new Date(initialValues.occurred_at)) : ""
  );

  const [kind, setKind] = useState<Kind>(initialValues?.kind ?? "nota");
  const [content, setContent] = useState(initialValues?.content ?? "");
  const [occurredAt, setOccurredAt] = useState(fechaInicial);
  const [motivo, setMotivo] = useState("");
  // Al crear, la fecha es "ahora" por defecto y se toma al enviar (no al
  // abrir la página): si el form queda abierto una hora, no se registra
  // con la hora vieja. Al editar, el campo de fecha siempre está visible.
  const [fechaManual, setFechaManual] = useState(editando);
  const [guardando, setGuardando] = useState(false);
  const [errorContenido, setErrorContenido] = useState<string | null>(null);
  const [errorMotivo, setErrorMotivo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const textoRef = useRef<HTMLTextAreaElement>(null);

  // Al entrar a editar, el foco va al texto (el botón "Editar" desaparece).
  useEffect(() => {
    if (editando) textoRef.current?.focus();
  }, [editando]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!content.trim()) {
      setErrorContenido("Escribe qué pasó antes de guardar.");
      return;
    }
    if (editando && motivo.trim().length < MIN_MOTIVO) {
      setErrorMotivo(`Escribe el motivo del cambio (mínimo ${MIN_MOTIVO} caracteres).`);
      return;
    }
    setErrorContenido(null);
    setErrorMotivo(null);
    const valores: EntryValues = {
      kind,
      content: content.trim(),
      occurred_at: fechaParaEnviar(),
      ...(editando ? { motivo: motivo.trim() } : {}),
    };
    setGuardando(true);
    setError(null);
    setMensaje(null);
    try {
      if (onSubmit) {
        await onSubmit(valores);
      } else {
        // Registro nuevo: se envía ya o queda en la cola local si no hay red.
        // `client_id` evita duplicados si se reintenta; `registrado_en` es la
        // hora de este dispositivo, por si el registro llega más tarde.
        const estado = await registrarEntrada({
          client_id: crypto.randomUUID(),
          patient_id: patientId,
          kind: valores.kind,
          content: valores.content,
          occurred_at: valores.occurred_at,
          registrado_en: new Date().toISOString(),
          source: "text",
        });
        if (estado === "enviada") {
          void qc.invalidateQueries({ queryKey: ["patients", patientId, "entries"] });
          setMensaje("Registrado ✓");
        } else {
          setMensaje("Guardado en este dispositivo. Se enviará al volver la conexión.");
        }
        setContent("");
        setFechaManual(false);
      }
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setGuardando(false);
    }
  }

  function fechaParaEnviar(): string {
    if (!fechaManual) return new Date().toISOString();
    // datetime-local pierde los segundos: si no se tocó la fecha,
    // conservamos el valor original para no "editarla" sin querer.
    if (initialValues && occurredAt === fechaInicial) return initialValues.occurred_at;
    return new Date(occurredAt).toISOString();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="card stack"
      aria-label={editando ? "Editar entrada" : "Nueva entrada de bitácora"}
      noValidate
    >
      <fieldset className={s.kinds}>
        <legend className="field-label">Tipo</legend>
        <div className={s.chips}>
          {KINDS.map((k) => (
            <label key={k.value} className={s.chipOption} data-kind={k.value}>
              <input
                type="radio"
                name={grupoKind}
                value={k.value}
                checked={kind === k.value}
                onChange={() => setKind(k.value)}
              />
              <CheckIcon />
              {k.label}
            </label>
          ))}
        </div>
      </fieldset>

      <FormField label="¿Qué pasó?" error={errorContenido}>
        {(props) => (
          <textarea
            {...props}
            ref={textoRef}
            placeholder="Ej: Durmió bien, almorzó completo y salimos a caminar 15 min."
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              setMensaje(null);
            }}
            className="input"
          />
        )}
      </FormField>

      {fechaManual && (
        <div className={s.fechaManual}>
          <FormField label="Fecha y hora">
            {(props) => (
              <input
                {...props}
                type="datetime-local"
                value={occurredAt}
                onChange={(e) => setOccurredAt(e.target.value)}
                className="input"
              />
            )}
          </FormField>
          {!editando && (
            <button type="button" onClick={() => setFechaManual(false)} className="btn btn-ghost">
              Usar la hora actual
            </button>
          )}
        </div>
      )}

      {editando && (
        <div className="field">
          <label htmlFor={idMotivo} className="field-label">
            Motivo del cambio
          </label>
          <input
            id={idMotivo}
            value={motivo}
            onChange={(e) => {
              setMotivo(e.target.value);
              setErrorMotivo(null);
            }}
            className="input"
            maxLength={500}
            aria-invalid={errorMotivo ? true : undefined}
            aria-describedby={errorMotivo ? `${idMotivo}-error` : undefined}
            placeholder="Ej: La hora era otra; corregimos el texto."
          />
          {errorMotivo && (
            <p id={`${idMotivo}-error`} className="field-error" role="alert">
              {errorMotivo}
            </p>
          )}
          <p className="muted small">
            La versión anterior no se borra: queda en el historial con quién la cambió y cuándo.
          </p>
        </div>
      )}

      {/* Botón justo bajo el texto: en móvil queda visible con el teclado abierto. */}
      <div className={s.formActions}>
        <button type="submit" disabled={guardando} className="btn btn-primary">
          {guardando ? "Guardando…" : editando ? "Guardar cambios" : "Registrar"}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn btn-ghost">
            Cancelar
          </button>
        )}
        {/* Región aria-live siempre presente; solo cambia su contenido. */}
        <span aria-live="polite" className={mensaje?.startsWith("Registrado") ? "badge badge-success" : undefined}>
          {mensaje}
        </span>
        {!fechaManual && (
          <span className="muted small">
            Fecha: ahora ·{" "}
            <button
              type="button"
              onClick={() => {
                setOccurredAt(isoLocal(new Date()));
                setFechaManual(true);
              }}
              className={s.linkButton}
            >
              Cambiar fecha
            </button>
          </span>
        )}
      </div>

      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}

function CheckIcon() {
  return (
    <svg className={s.check} width="16" height="16" viewBox="0 0 20 20" aria-hidden="true">
      <path
        d="M4 10.5l4 4 8-9"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function isoLocal(d: Date): string {
  // datetime-local necesita 'YYYY-MM-DDTHH:MM' sin segundos ni timezone.
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
