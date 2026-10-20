import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { AppShell } from "../components/app-shell";
import { useCreatePatient } from "../hooks/use-api";

export default function PatientNewPage() {
  const navigate = useNavigate();
  const crear = useCreatePatient();

  const [nombre, setNombre] = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");
  const [notas, setNotas] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const payload = {
      nombre: nombre.trim(),
      fecha_nacimiento: fechaNacimiento || null,
      notas: notas.trim() || null,
    };
    const paciente = await crear.mutateAsync(payload);
    navigate(`/patients/${paciente.id}`);
  }

  return (
    <AppShell>
      <nav>
        <Link to="/">← Volver a pacientes</Link>
      </nav>
      <h1>Nuevo paciente</h1>
      <p className="muted">
        Quien crea el paciente queda automáticamente como admin del grupo.
      </p>

      <form onSubmit={onSubmit} className="stack">
        <label className="field">
          <span className="field-label">Nombre</span>
          <input
            required
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="input"
            placeholder="Doña Elba"
          />
        </label>

        <label className="field">
          <span className="field-label">Fecha de nacimiento (opcional)</span>
          <input
            type="date"
            value={fechaNacimiento}
            onChange={(e) => setFechaNacimiento(e.target.value)}
            className="input"
          />
        </label>

        <label className="field">
          <span className="field-label">Notas clínicas (opcional)</span>
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            className="input"
            placeholder="Alergias, comorbilidades, etc."
          />
        </label>

        {crear.isError && (
          <p className="alert" role="alert">
            {crear.error instanceof Error ? crear.error.message : "Error"}
          </p>
        )}

        <button
          type="submit"
          disabled={crear.isPending || !nombre.trim()}
          className="btn btn-primary"
        >
          {crear.isPending ? "Guardando…" : "Crear paciente"}
        </button>
      </form>
    </AppShell>
  );
}

