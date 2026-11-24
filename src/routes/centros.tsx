import { useEffect, useState } from "react";

import { AppShell } from "../components/app-shell";
import { SlowHint } from "../components/slow-hint";
import { useCentros } from "../hooks/use-api";
import { useTituloPagina } from "../hooks/use-titulo-pagina";
import s from "../styles/secciones.module.css";
import { mensajeError } from "../utils/errores";

// Mismos nombres que usa el scraper (scripts/centros_publicos.py del backend),
// de norte a sur.
const REGIONES = [
  "Arica y Parinacota",
  "Tarapacá",
  "Antofagasta",
  "Atacama",
  "Coquimbo",
  "Valparaíso",
  "Metropolitana",
  "O'Higgins",
  "Maule",
  "Ñuble",
  "Biobío",
  "La Araucanía",
  "Los Ríos",
  "Los Lagos",
  "Aysén",
  "Magallanes",
];

// Los tipos que deja el scraper (DEIS del MINSAL + farmacias de OpenStreetMap),
// en el orden en que más le sirven a quien cuida.
const TIPOS = [
  "Farmacia",
  "CESFAM",
  "CECOSF",
  "Consultorio",
  "Urgencia (SAPU/SAR)",
  "Urgencia rural (SUR)",
  "Hospital",
  "Clínica",
  "Centro médico",
  "Centro de especialidades",
  "Centro de demencia",
  "Salud mental (COSAM)",
  "Rehabilitación",
  "Posta rural",
];

const LIMITE = 100;

/** Centros de salud y farmacias (datos públicos que carga el scraper). */
export default function CentrosPage() {
  useTituloPagina("Centros y farmacias");
  const [region, setRegion] = useState("");
  const [tipo, setTipo] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [texto, setTexto] = useState("");

  // La búsqueda va al servidor: se espera a que la persona deje de escribir.
  useEffect(() => {
    const t = setTimeout(() => setTexto(busqueda.trim()), 350);
    return () => clearTimeout(t);
  }, [busqueda]);

  const q = texto.length >= 2 ? texto : undefined;
  const centros = useCentros({ region: region || undefined, tipo: tipo || undefined, q }, LIMITE);
  const filtrando = Boolean(region || tipo || q);
  const lista = centros.data ?? [];

  return (
    <AppShell>
      <div className="stack-sm">
        <h1>Centros y farmacias</h1>
        <p className={`muted ${s.intro}`}>
          Datos públicos del MINSAL y de OpenStreetMap. Confirma horarios llamando antes de ir.
        </p>
      </div>

      <div className={`card ${s.filtros}`}>
        <label className="field">
          <span className="field-label">Región</span>
          <select className="input" value={region} onChange={(e) => setRegion(e.target.value)}>
            <option value="">Todas</option>
            {REGIONES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field-label">Tipo</span>
          <select className="input" value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="">Todos</option>
            {TIPOS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field-label">Comuna o nombre</span>
          <input
            className="input"
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Ej: Providencia"
          />
        </label>
      </div>

      {centros.isLoading && <SlowHint />}
      {centros.error && (
        <p className="alert" role="alert">
          {mensajeError(centros.error)}
        </p>
      )}
      {centros.data && lista.length === 0 && !filtrando && (
        <p className="card muted">
          Todavía no hay centros cargados. Se agregan automáticamente cuando corre la actualización
          de datos públicos.
        </p>
      )}
      {centros.data && lista.length === 0 && filtrando && (
        <p className="muted">No encontramos centros con esos filtros.</p>
      )}
      {lista.length > 0 && (
        <p className="muted small" aria-live="polite">
          {lista.length === LIMITE
            ? `Mostrando los primeros ${LIMITE}. Elige región, tipo o comuna para acotar.`
            : `${lista.length} ${lista.length === 1 ? "resultado" : "resultados"}.`}
        </p>
      )}

      <ul className={`list-reset ${s.lista}`}>
        {lista.map((c) => {
          const lugar = [c.direccion, c.comuna, c.region].filter(Boolean).join(", ");
          const mapa = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            `${c.nombre} ${lugar}`
          )}`;
          return (
            <li key={c.id} className={`card ${s.item}`}>
              <div className={s.itemPrincipal}>
                <p className={s.itemTitulo}>{c.nombre}</p>
                <p className="muted small">
                  <span className="badge">{c.tipo}</span> {lugar}
                </p>
              </div>
              <div className={s.acciones}>
                {c.telefono && (
                  <a className="btn" href={`tel:${c.telefono.replace(/\s+/g, "")}`}>
                    Llamar
                  </a>
                )}
                <a className="btn btn-ghost" href={mapa} target="_blank" rel="noreferrer">
                  Cómo llegar
                </a>
              </div>
            </li>
          );
        })}
      </ul>
    </AppShell>
  );
}
