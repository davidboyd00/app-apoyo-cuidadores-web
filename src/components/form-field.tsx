import { useId, type ReactNode } from "react";

type ControlProps = {
  id: string;
  "aria-invalid"?: true;
  "aria-describedby"?: string;
};

/**
 * Campo de formulario accesible: asocia label, ayuda y error al control
 * (htmlFor + aria-describedby) y anuncia el error con aria-live.
 *
 *   <FormField label="Correo" error={err}>
 *     {(props) => <input {...props} className="input" />}
 *   </FormField>
 */
export function FormField({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  children: (props: ControlProps) => ReactNode;
}) {
  const id = useId();
  const hintId = `${id}-ayuda`;
  const errorId = `${id}-error`;
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(" ");

  return (
    <div className="field">
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      {children({
        id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describedBy || undefined,
      })}
      {hint && (
        <p id={hintId} className="muted small">
          {hint}
        </p>
      )}
      <p id={errorId} className="field-error" aria-live="polite">
        {error}
      </p>
    </div>
  );
}
