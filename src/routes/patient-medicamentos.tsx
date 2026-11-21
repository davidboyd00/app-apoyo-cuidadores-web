import { useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";

import { PatientLayout } from "../components/patient-layout";
import { SlowHint } from "../components/slow-hint";
import {
  useAdherencia,
  useCrearMedicamento,
  useDesactivarMedicamento,
  useDosisRegistradas,
  useMedicamentos,
  useProximasDosis,
} from "../hooks/use-api";
import { useAutores } from "../hooks/use-autores";
import type { Schemas } from "../lib/api";
import { esDosis, type PendienteDosis } from "../lib/outbox";
import { registrarDosis } from "../lib/sincronizacion";
import { useSincronizacion } from "../providers/sync-provider";
import d from "../styles/patient-detail.module.css";
import s from "../styles/secciones.module.css";
import { diaLargo, horaCorta } from "../utils/bitacora";
import { mensajeError } from "../utils/errores";

type Estado = Schemas["MedicationDoseCreate"]["status"];
const ETIQUETA_ESTADO: Record<Estado, string> = {
  tomada: "Tomada",
  omitida: "Omitida",
  postpuesta: "Más tarde",
};

export default function PatientMedicamentosPage() {
  return <PatientLayout seccion="Medicamentos">{() => <Medicamentos />}</PatientLayout>;
}

function Medicamentos() {
  const { id } = useParams();
  const meds = useMedicamentos(id);
  const proximas = useProximasDosis(id, 24);
  const activos = (meds.data ?? []).filter((m) => m.activo);

  return (
    <section className={`stack ${d.section}`} aria-labelledby="titulo-meds">
      <h2 id="titulo-meds">Medicamentos</h2>
      <p className={`muted ${s.intro}`}>
        Registren cada dosis para que toda la familia sepa si ya la tomó. Funciona sin conexión: se
        envía cuando vuelve la red.
      </p>

      <div className={s.grid2}>
        <div className="stack-sm">
          <h3>Próximas dosis (24 horas)</h3>
          {proximas.isLoading && <SlowHint />}
          {proximas.error && (
            <p className="alert" role="alert">
              {mensajeError(proximas.error)}
            </p>
          )}
          {proximas.data?.length === 0 && (
            <p className="card muted">
              No hay dosis programadas. Agrega horarios a un medicamento para verlas aquí.
            </p>
          )}
          <ul className={`list-reset ${s.lista}`}>
            {proximas.data?.map((p) => (
              <li key={`${p.medication_id}-${p.scheduled_for}`}>
                {id && <DosisProgramada patientId={id} dosis={p} />}
              </li>
            ))}
          </ul>
        </div>
        {id && <Adherencia patientId={id} />}
      </div>

      <div className="stack-sm">
        <h3>Medicamentos activos</h3>
        {meds.isLoading && <div className={`skeleton ${d.skeletonEntry}`} />}
        {meds.error && (
          <p className="alert" role="alert">
            {mensajeError(meds.error)}
          </p>
        )}
        {meds.data && activos.length === 0 && (
          <p className="card muted">Todavía no hay medicamentos registrados.</p>
        )}
        <ul className={`list-reset ${s.lista}`}>
          {activos.map((m) => id && <MedicamentoItem key={m.id} patientId={id} med={m} />)}
        </ul>
      </div>

      {id && <AgregarMedicamento patientId={id} />}
    </section>
  );
}

function DosisProgramada({ patientId, dosis }: { patientId: string; dosis: Schemas["UpcomingDose"] }) {
  const qc = useQueryClient();
  const registradas = useDosisRegistradas(patientId, dosis.medication_id);
  const { pendientes } = useSincronizacion();
  const { autorDe } = useAutores(patientId);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const momento = new Date(dosis.scheduled_for).getTime();

  const yaRegistrada = registradas.data?.find(
    (r) => new Date(r.scheduled_for).getTime() === momento
  );
  const enCola = pendientes.find(
    (p): p is PendienteDosis =>
      esDosis(p) && p.medication_id === dosis.medication_id && new Date(p.scheduled_for).getTime() === momento
  );

  async function marcar(status: Estado) {
    setError(null);
    setEnviando(true);
    try {
      const resultado = await registrarDosis({
        tipo: "dosis",
        client_id: crypto.randomUUID(),
        patient_id: patientId,
        medication_id: dosis.medication_id,
        medicamento: dosis.nombre,
        scheduled_for: dosis.scheduled_for,
        taken_at: status === "tomada" ? new Date().toISOString() : null,
        status,
        registrado_en: new Date().toISOString(),
      });
      if (resultado === "enviada") {
        void qc.invalidateQueries({ queryKey: ["patients", patientId, "medications"] });
      }
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className={`card ${s.item}`}>
      <div className={s.itemPrincipal}>
        <p className={s.itemTitulo}>
          {horaCorta(dosis.scheduled_for)} · {dosis.nombre}
        </p>
        <p className="muted small">
          {dosis.dosis ? `${dosis.dosis} · ` : ""}
          {diaLargo(dosis.scheduled_for)}
        </p>
      </div>
      {yaRegistrada ? (
        <span className={yaRegistrada.status === "tomada" ? "badge badge-success" : "badge badge-warning"}>
          {ETIQUETA_ESTADO[yaRegistrada.status]} · {autorDe(yaRegistrada.author_id).etiqueta ?? "…"}
        </span>
      ) : enCola ? (
        <span className={enCola.error ? "badge badge-warning" : "badge"}>
          {enCola.error ? "No se envió" : `${ETIQUETA_ESTADO[enCola.status]} · pendiente de sincronizar`}
        </span>
      ) : (
        <div className={s.acciones} role="group" aria-label={`Registrar dosis de ${dosis.nombre}`}>
          <button type="button" className="btn btn-primary" disabled={enviando} onClick={() => marcar("tomada")}>
            Tomada
          </button>
          <button type="button" className="btn" disabled={enviando} onClick={() => marcar("omitida")}>
            Omitida
          </button>
          <button type="button" className="btn btn-ghost" disabled={enviando} onClick={() => marcar("postpuesta")}>
            Más tarde
          </button>
        </div>
      )}
      {error && (
        <p className={`field-error ${s.anchoCompleto}`} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function Adherencia({ patientId }: { patientId: string }) {
  const adherencia = useAdherencia(patientId, 7);
  if (!adherencia.data) return null;
  const a = adherencia.data;
  return (
    <div className={`card stack-sm ${s.destacado}`}>
      <h3>Adherencia · últimos 7 días</h3>
      {a.total_dosis_registradas === 0 ? (
        <p className="muted">Aún no hay dosis registradas esta semana.</p>
      ) : (
        <>
          <p className={s.cifra}>{a.porcentaje_adherencia}%</p>
          <p className="muted small">
            {a.tomadas} tomadas · {a.omitidas} omitidas · {a.postpuestas} más tarde, de{" "}
            {a.total_dosis_registradas} registradas.
          </p>
        </>
      )}
      <p className="muted small">Solo cuenta lo que la familia registró.</p>
    </div>
  );
}

function MedicamentoItem({ patientId, med }: { patientId: string; med: Schemas["Medication"] }) {
  const desactivar = useDesactivarMedicamento(patientId);
  return (
    <li className={`card ${s.item}`}>
      <div className={s.itemPrincipal}>
        <p className={s.itemTitulo}>
          {med.nombre}
          {med.dosis && <span className="muted"> · {med.dosis}</span>}
        </p>
        <p className="muted small">
          {med.horarios && med.horarios.length > 0
            ? `Horarios: ${med.horarios.map((h) => h.slice(0, 5)).join(", ")}`
            : med.frecuencia_horas
              ? `Cada ${med.frecuencia_horas} horas`
              : "Sin horario fijo"}
          {med.notas && ` · ${med.notas}`}
        </p>
      </div>
      <button
        type="button"
        className="btn btn-ghost btn-danger"
        disabled={desactivar.isPending}
        onClick={() => {
          if (window.confirm(`¿Dejar de usar ${med.nombre}? Sus dosis registradas se conservan.`)) {
            desactivar.mutate(med.id);
          }
        }}
      >
        Dejar de usar
      </button>
      {desactivar.isError && (
        <p className={`field-error ${s.anchoCompleto}`} role="alert">
          {mensajeError(desactivar.error)}
        </p>
      )}
    </li>
  );
}

function AgregarMedicamento({ patientId }: { patientId: string }) {
  const crear = useCrearMedicamento(patientId);
  const [nombre, setNombre] = useState("");
  const [dosis, setDosis] = useState("");
  const [horarios, setHorarios] = useState<string[]>(["08:00"]);
  const [notas, setNotas] = useState("");
  const [aviso, setAviso] = useState<string | null>(null);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) return;
    setAviso(null);
    crear.mutate(
      {
        nombre: nombre.trim(),
        dosis: dosis.trim() || null,
        horarios: horarios.filter(Boolean).map((h) => `${h}:00`),
        notas: notas.trim() || null,
      },
      {
        onSuccess: () => {
          setNombre("");
          setDosis("");
          setHorarios(["08:00"]);
          setNotas("");
          setAviso("Medicamento agregado ✓");
        },
      }
    );
  }

  return (
    <form onSubmit={onSubmit} className="card stack" aria-label="Agregar medicamento">
      <h3>Agregar medicamento</h3>
      <div className={`${s.campos} ${s.campos2}`}>
        <label className="field">
          <span className="field-label">Nombre</span>
          <input
            className="input"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Losartán"
            required
          />
        </label>
        <label className="field">
          <span className="field-label">Dosis (opcional)</span>
          <input
            className="input"
            value={dosis}
            onChange={(e) => setDosis(e.target.value)}
            placeholder="Ej: 50 mg, 1 comprimido"
          />
        </label>
      </div>
      <fieldset className={d.kinds}>
        <legend className="field-label">Horarios</legend>
        <div className={s.horarios}>
          {horarios.map((h, i) => (
            <span key={i} className="row">
              <input
                type="time"
                className={`input ${s.horarioInput}`}
                value={h}
                aria-label={`Horario ${i + 1}`}
                onChange={(e) =>
                  setHorarios((prev) => prev.map((x, j) => (j === i ? e.target.value : x)))
                }
              />
              {horarios.length > 1 && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  aria-label={`Quitar horario ${i + 1}`}
                  onClick={() => setHorarios((prev) => prev.filter((_, j) => j !== i))}
                >
                  Quitar
                </button>
              )}
            </span>
          ))}
          <button type="button" className="btn btn-ghost" onClick={() => setHorarios((p) => [...p, ""])}>
            + Otro horario
          </button>
        </div>
      </fieldset>
      <label className="field">
        <span className="field-label">Notas (opcional)</span>
        <input
          className="input"
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          placeholder="Ej: con comida"
        />
      </label>
      <div className="row">
        <button type="submit" className="btn btn-primary" disabled={crear.isPending || !nombre.trim()}>
          {crear.isPending ? "Guardando…" : "Agregar"}
        </button>
        <span aria-live="polite" className={aviso ? "badge badge-success" : undefined}>
          {aviso}
        </span>
      </div>
      {crear.isError && (
        <p className="alert" role="alert">
          {mensajeError(crear.error)}
        </p>
      )}
    </form>
  );
}
