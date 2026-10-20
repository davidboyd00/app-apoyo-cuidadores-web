import { Link } from "react-router-dom";

import { AppHeader } from "../components/app-header";
import { SlowHint } from "../components/slow-hint";
import { usePatients } from "../hooks/use-api";

export default function PatientsPage() {
  const { data: pacientes, isLoading, error } = usePatients();

  return (
    <main className="container page stack">
      <AppHeader />
      <div className="row-between">
        <h1>Pacientes</h1>
        <Link to="/patients/new" className="btn btn-primary">
          + Nuevo paciente
        </Link>
      </div>

      {isLoading && (
        <>
          <p>Cargando…</p>
          <SlowHint />
        </>
      )}
      {error && (
        <p className="alert" role="alert">
          {error instanceof Error ? error.message : "Error"}
        </p>
      )}

      {pacientes && pacientes.length === 0 && (
        <div className="card stack-sm">
          <p>Todavía no tienes pacientes en tu red de cuidado.</p>
          <p className="muted">
            Crea uno para empezar a registrar la bitácora.
          </p>
        </div>
      )}

      <ul className="list-reset stack-sm">
        {pacientes?.map((p) => (
          <li key={p.id} className="card">
            <Link to={`/patients/${p.id}`}>
              <strong>{p.nombre}</strong>
              {p.fecha_nacimiento && (
                <span className="muted">
                  &nbsp;· nacido {new Date(p.fecha_nacimiento).toLocaleDateString("es-CL")}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}

