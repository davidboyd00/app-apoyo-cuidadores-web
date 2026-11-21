import { useMemo, useState } from "react";

import { AppShell } from "../components/app-shell";
import { SlowHint } from "../components/slow-hint";
import { useCentros } from "../hooks/use-api";
import { useTituloPagina } from "../hooks/use-titulo-pagina";
import s from "../styles/secciones.module.css";
import { mensajeError } from "../utils/errores";

function normalizar(t: string): string {
  return t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Centros de salud y farmacias (datos públicos que cargan los scrapers). */
export default function CentrosPage() {
  useTituloPagina("Centros y farmacias");
  const [region, setRegion] = useState("");
  const [tipo, setTipo] = useState("");
  const [busqueda, setBusqueda] = useState("");
  // Sin filtro trae todo (hasta 200) para poblar las listas de región y tipo.
  const todos = useCentros({});
  const centros = useCentros({ region: region || undefined, tipo: tipo || undefined });

  const regiones = useMemo(
    () => [...new Set((todos.data ?? []).map((c) => c.region))].sort(),
    [todos.data]
  );
  const tipos = useMemo(() => [...new Set((todos.data ?? []).map((c) => c.tipo))].sort(), [todos.data]);
  const q = normalizar(busqueda.trim());
  const visibles = (centros.data ?? []).filter(
    (c) => !q || normalizar(`${c.nombre} ${c.comuna ?? ""} ${c.direccion ?? ""}`).includes(q)
  );

  return (
    <AppShell>
      <div className="stack-sm">
        <h1>Centros y farmacias</h1>
        <p className={`muted ${s.intro}`}>
          Datos públicos de centros de salud y farmacias. Confirma horarios llamando antes de ir.
        </p>
      </div>

      <div className={`card ${s.filtros}`}>
        <label className="field">
          <span className="field-label">Buscar</span>
          <input
            className="input"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Nombre, comuna o dirección"
          />
        </label>
        <label className="field">
          <span className="field-label">Región</span>
          <select className="input" value={region} onChange={(e) => setRegion(e.target.value)}>
            <option value="">Todas</option>
            {regiones.map((r) => (
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
            {tipos.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
      </div>

      {centros.isLoading && <SlowHint />}
      {centros.error && (
        <p className="alert" role="alert">
          {mensajeError(centros.error)}
        </p>
      )}
      {centros.data && centros.data.length === 0 && !region && !tipo && (
        <p className="card muted">
          Todavía no hay centros cargados. Se agregan automáticamente cuando corre la actualización
          de datos públicos.
        </p>
      )}
      {centros.data && visibles.length === 0 && (region || tipo || q) && (
        <p className="muted">No encontramos centros con esos filtros.</p>
      )}

      <ul className={`list-reset ${s.lista}`} aria-live="polite">
        {visibles.map((c) => {
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
