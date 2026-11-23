import { useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";

import { KindChip } from "../components/kind-chip";
import { PatientLayout } from "../components/patient-layout";
import { SlowHint } from "../components/slow-hint";
import {
  useEntradasDesde,
  useMensajesAsistente,
  useMetricaAsistente,
  usePreguntar,
} from "../hooks/use-api";
import { useAutores } from "../hooks/use-autores";
import type { Schemas } from "../lib/api";
import d from "../styles/patient-detail.module.css";
import s from "../styles/secciones.module.css";
import { fechaCompleta, tiempoRelativo } from "../utils/bitacora";
import { mensajeError } from "../utils/errores";

const SUGERENCIAS = [
  "¿Cómo ha dormido esta semana?",
  "¿Tomó todos sus medicamentos?",
  "¿Hubo síntomas nuevos?",
  "¿Cómo ha estado su ánimo?",
];

const VENTANAS = [
  { dias: 7, etiqueta: "Últimos 7 días" },
  { dias: 30, etiqueta: "Últimos 30 días" },
  { dias: 90, etiqueta: "Últimos 90 días" },
];

export default function PatientAsistentePage() {
  return <PatientLayout seccion="Asistente">{() => <Asistente />}</PatientLayout>;
}

function Asistente() {
  const { id } = useParams();
  const preguntar = usePreguntar(id);
  const mensajes = useMensajesAsistente(id);
  const [pregunta, setPregunta] = useState("");
  const [ventana, setVentana] = useState(30);
  const [ultima, setUltima] = useState<{
    pregunta: string;
    respuesta: Schemas["AssistantAnswer"];
    ventana: number;
    hecha: string;
  } | null>(null);

  function enviar(texto: string) {
    const limpia = texto.trim();
    if (limpia.length < 3) return;
    preguntar.mutate(
      { pregunta: limpia, ventana_dias: ventana },
      {
        onSuccess: (respuesta) => {
          setUltima({ pregunta: limpia, respuesta, ventana, hecha: new Date().toISOString() });
          setPregunta("");
        },
      }
    );
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    enviar(pregunta);
  }

  // El historial trae también la última respuesta: no la repetimos.
  const anteriores = (mensajes.data ?? []).filter(
    (m) => !(ultima && m.conversation_id === ultima.respuesta.conversation_id && m.pregunta === ultima.pregunta)
  );

  return (
    <section className={`stack ${d.section}`} aria-labelledby="titulo-asistente">
      <h2 id="titulo-asistente">Asistente</h2>
      <p className={`muted ${s.intro}`}>
        Pregunta sobre lo que la familia registró. El asistente responde <strong>solo</strong> con
        esos registros y muestra en cuáles se basó, para que puedas comprobarlo. No reemplaza la
        indicación de un profesional de salud.
      </p>
      <div className={s.urgencia} role="note">
        <p>¿Es una urgencia? No esperes al asistente.</p>
        <a className={`btn ${s.llamar}`} href="tel:131">
          <svg
            aria-hidden="true"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
          Llamar al 131 (SAMU)
        </a>
      </div>

      <form onSubmit={onSubmit} className="card stack" aria-label="Preguntar al asistente">
        <label className="field">
          <span className="field-label">Tu pregunta</span>
          <textarea
            className="input"
            value={pregunta}
            onChange={(e) => setPregunta(e.target.value)}
            placeholder="Ej: ¿Cómo ha dormido esta semana?"
            rows={2}
          />
        </label>
        <div className={s.sugerencias} aria-label="Preguntas sugeridas">
          {SUGERENCIAS.map((q) => (
            <button
              key={q}
              type="button"
              className={`btn btn-ghost ${s.sugerencia}`}
              onClick={() => enviar(q)}
              disabled={preguntar.isPending}
            >
              {q}
            </button>
          ))}
        </div>
        <div className="row-between">
          <label className="row small">
            <span className="field-label">Revisar</span>
            <select className="input" value={ventana} onChange={(e) => setVentana(Number(e.target.value))}>
              {VENTANAS.map((v) => (
                <option key={v.dias} value={v.dias}>
                  {v.etiqueta}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={preguntar.isPending || pregunta.trim().length < 3}
          >
            {preguntar.isPending ? "Pensando…" : "Preguntar"}
          </button>
        </div>
        {preguntar.isPending && (
          <p className="muted small" aria-live="polite">
            Revisando la bitácora… puede tardar unos segundos.
          </p>
        )}
        {preguntar.isError && (
          <p className="alert" role="alert">
            {mensajeError(preguntar.error)}
          </p>
        )}
      </form>

      <div aria-live="polite">
        {ultima && id && (
          <Respuesta
            patientId={id}
            pregunta={ultima.pregunta}
            respuesta={ultima.respuesta.respuesta}
            citas={ultima.respuesta.cited_entry_ids}
            suficiente={ultima.respuesta.suficiente ?? true}
            desde={new Date(new Date(ultima.hecha).getTime() - ultima.ventana * 86_400_000).toISOString()}
            cuando={ultima.hecha}
            abierta
          />
        )}
      </div>

      {id && <MetricaVerificable patientId={id} />}

      <div className="stack-sm">
        <h3>Preguntas anteriores</h3>
        {mensajes.isLoading && <SlowHint />}
        {mensajes.data && anteriores.length === 0 && (
          <p className="muted">Todavía no hay preguntas anteriores.</p>
        )}
        {id &&
          anteriores.map((m) => (
            <Respuesta
              key={m.id}
              patientId={id}
              pregunta={m.pregunta}
              respuesta={m.respuesta}
              citas={m.cited_entry_ids}
              suficiente={m.suficiente ?? true}
              desde={new Date(new Date(m.created_at).getTime() - 90 * 86_400_000).toISOString()}
              cuando={m.created_at}
            />
          ))}
      </div>
    </section>
  );
}

function Respuesta({
  patientId,
  pregunta,
  respuesta,
  citas,
  suficiente,
  desde,
  cuando,
  abierta = false,
}: {
  patientId: string;
  pregunta: string;
  respuesta: string;
  citas: string[];
  suficiente: boolean;
  desde: string;
  cuando: string;
  abierta?: boolean;
}) {
  const [verCitas, setVerCitas] = useState(abierta);
  return (
    <article className="card stack-sm">
      <p className="small muted" title={fechaCompleta(cuando)}>
        Preguntaste {tiempoRelativo(cuando)}:
      </p>
      <p>
        <strong>{pregunta}</strong>
      </p>
      <p className={s.respuesta}>{respuesta}</p>
      <div className="row">
        {!suficiente && <span className="badge badge-warning">La bitácora no alcanza para responder</span>}
        {citas.length > 0 && (
          <button
            type="button"
            className="btn btn-ghost"
            aria-expanded={verCitas}
            onClick={() => setVerCitas((v) => !v)}
          >
            {verCitas ? "Ocultar registros" : `Basado en ${citas.length} ${citas.length === 1 ? "registro" : "registros"}`}
          </button>
        )}
      </div>
      {verCitas && citas.length > 0 && <Citas patientId={patientId} ids={citas} desde={desde} />}
    </article>
  );
}

/** Las entradas que citó la respuesta: la familia verifica contra lo registrado. */
function Citas({ patientId, ids, desde }: { patientId: string; ids: string[]; desde: string }) {
  const entradas = useEntradasDesde(patientId, desde);
  const { autorDe } = useAutores(patientId);
  if (entradas.isLoading) return <p className="muted small">Cargando registros…</p>;
  if (entradas.error) return <p className="field-error">{mensajeError(entradas.error)}</p>;
  const porId = new Map((entradas.data ?? []).map((e) => [e.id, e]));
  const encontradas = ids.map((i) => porId.get(i)).filter((e): e is Schemas["Entry"] => !!e);
  const faltantes = ids.length - encontradas.length;
  return (
    <div className={s.citas}>
      {encontradas.map((e) => (
        <div key={e.id} className={s.cita}>
          <span className="row small">
            <KindChip kind={e.kind} /> {fechaCompleta(e.occurred_at)} · {autorDe(e.author_id).etiqueta ?? "…"}
          </span>
          <span>{e.content}</span>
        </div>
      ))}
      {faltantes > 0 && (
        <p className="muted small">
          {faltantes} {faltantes === 1 ? "registro ya no está visible" : "registros ya no están visibles"} (fue
          borrado o es más antiguo).
        </p>
      )}
    </div>
  );
}

function MetricaVerificable({ patientId }: { patientId: string }) {
  const m = useMetricaAsistente(patientId);
  if (!m.data || m.data.total_respuestas === 0) return null;
  return (
    <p className="muted small" title="KPI comprometido: más del 90% de las respuestas verificables">
      Respuestas verificables en 30 días: <strong>{m.data.porcentaje_verificable}%</strong> de{" "}
      {m.data.total_respuestas} {m.data.cumple_kpi ? "✓" : ""}
    </p>
  );
}
