import { useParams } from "react-router-dom";

import { MembersPanel } from "../components/members-panel";
import { PatientLayout } from "../components/patient-layout";
import s from "../styles/patient-detail.module.css";

export default function PatientRedPage() {
  const { id } = useParams();
  return (
    <PatientLayout seccion="Red de cuidado">
      {() => (
        <section className={`stack ${s.section}`} aria-labelledby="titulo-red">
          <h2 id="titulo-red">Red de cuidado</h2>
          <p className="muted">
            Las personas que comparten la bitácora. Quien administra puede invitar a más familiares.
          </p>
          {id && <MembersPanel patientId={id} />}
        </section>
      )}
    </PatientLayout>
  );
}
