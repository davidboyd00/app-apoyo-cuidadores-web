import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

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
    <main style={styles.wrap}>
      <nav style={styles.breadcrumb}>
        <Link to="/">← Volver a pacientes</Link>
      </nav>
      <h1>Nuevo paciente</h1>
      <p style={styles.muted}>
        Quien crea el paciente queda automáticamente como admin del grupo.
      </p>

      <form onSubmit={onSubmit} style={styles.form}>
        <label style={styles.label}>
          <span>Nombre</span>
          <input
            required
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            style={styles.input}
            placeholder="Doña Elba"
          />
        </label>

        <label style={styles.label}>
          <span>Fecha de nacimiento (opcional)</span>
          <input
            type="date"
            value={fechaNacimiento}
            onChange={(e) => setFechaNacimiento(e.target.value)}
            style={styles.input}
          />
        </label>

        <label style={styles.label}>
          <span>Notas clínicas (opcional)</span>
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            style={{ ...styles.input, minHeight: 90, resize: "vertical" }}
            placeholder="Alergias, comorbilidades, etc."
          />
        </label>

        {crear.isError && (
          <div style={styles.error}>
            {crear.error instanceof Error ? crear.error.message : "Error"}
          </div>
        )}

        <button
          type="submit"
          disabled={crear.isPending || !nombre.trim()}
          style={styles.primary}
        >
          {crear.isPending ? "Guardando…" : "Crear paciente"}
        </button>
      </form>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: { maxWidth: 560, margin: "40px auto", padding: 24, fontFamily: "system-ui" },
  breadcrumb: { marginBottom: 12 },
  muted: { color: "#666" },
  form: { display: "flex", flexDirection: "column", gap: 14, marginTop: 20 },
  label: { display: "flex", flexDirection: "column", gap: 4 },
  input: {
    padding: 10,
    fontSize: 15,
    borderRadius: 8,
    border: "1px solid #ccc",
    fontFamily: "inherit",
  },
  primary: {
    marginTop: 6,
    padding: 12,
    borderRadius: 8,
    border: "none",
    background: "#0A84FF",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 600,
  },
  error: { color: "#c00", fontSize: 14 },
};
