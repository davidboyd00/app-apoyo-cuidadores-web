import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { AppShell } from "../components/app-shell";
import { FormField } from "../components/form-field";
import { useCreatePatient } from "../hooks/use-api";
import { useTituloPagina } from "../hooks/use-titulo-pagina";
import s from "../styles/patients.module.css";

export default function PatientNewPage() {
  useTituloPagina("Agregar persona");
  const navigate = useNavigate();
  const crear = useCreatePatient();

  const [nombre, setNombre] = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");
  const [notas, setNotas] = useState("");
  const [errorNombre, setErrorNombre] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) {
      setErrorNombre("Escribe el nombre de la persona que cuidas.");
      return;
    }
    setErrorNombre(null);
    const payload = {
      nombre: nombre.trim(),
      fecha_nacimiento: fechaNacimiento || null,
      notas: notas.trim() || null,
    };
    try {
      const paciente = await crear.mutateAsync(payload);
      navigate(`/patients/${paciente.id}`);
    } catch {
      // El error queda en `crear.error` y se muestra sobre el botón.
    }
  }

  return (
    <AppShell>
      <nav>
        <Link to="/">← Volver</Link>
      </nav>
      <div className="stack-sm">
        <h1>Agregar a la persona que cuidas</h1>
        <p className="muted">
          Quien la agrega queda como administrador del grupo y puede invitar a la familia.
        </p>
      </div>

      <form onSubmit={onSubmit} className={`card stack ${s.formCard}`} noValidate>
        <FormField label="Nombre" error={errorNombre}>
          {(props) => (
            <input
              {...props}
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="input"
              placeholder="Ej: Elba Rojas"
              autoComplete="off"
            />
          )}
        </FormField>

        <FormField label="Fecha de nacimiento (opcional)">
          {(props) => (
            <input
              {...props}
              type="date"
              value={fechaNacimiento}
              onChange={(e) => setFechaNacimiento(e.target.value)}
              className="input"
            />
          )}
        </FormField>

        <FormField
          label="Notas de salud (opcional)"
          hint="Solo lo necesario para el cuidado: alergias, diagnósticos, indicaciones."
        >
          {(props) => (
            <textarea
              {...props}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              className="input"
            />
          )}
        </FormField>

        {crear.isError && (
          <p className="alert" role="alert">
            {crear.error instanceof Error ? crear.error.message : "Error"}
          </p>
        )}

        <div className="row">
          <button type="submit" disabled={crear.isPending} className="btn btn-primary">
            {crear.isPending ? "Guardando…" : "Guardar"}
          </button>
          <Link to="/" className="btn btn-ghost">
            Cancelar
          </Link>
        </div>
      </form>
    </AppShell>
  );
}
