import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";

import { ConsentGate } from "./components/consent-gate";
import { ProtectedRoute } from "./components/protected-route";
import { AuthProvider } from "./providers/auth-provider";
import { QueryProvider } from "./providers/query-provider";
import { SyncProvider } from "./providers/sync-provider";
import ConsentPage from "./routes/consent";
import PatientDetailPage from "./routes/patient-detail";
import PatientNewPage from "./routes/patient-new";
import PatientsPage from "./routes/patients";
import ProfilePage from "./routes/profile";
import SignInPage from "./routes/sign-in";
import SignUpPage from "./routes/sign-up";

// Secciones secundarias: se descargan al entrar (primera carga más liviana en el celular).
const CentrosPage = lazy(() => import("./routes/centros"));
const PatientAsistentePage = lazy(() => import("./routes/patient-asistente"));
const PatientMedicamentosPage = lazy(() => import("./routes/patient-medicamentos"));
const PatientRedPage = lazy(() => import("./routes/patient-red"));
const PatientResumenesPage = lazy(() => import("./routes/patient-resumenes"));
const PatientTurnosPage = lazy(() => import("./routes/patient-turnos"));
const ResumenImprimirPage = lazy(() => import("./routes/resumen-imprimir"));

function Cargando() {
  return (
    <p className="container page muted" aria-busy="true">
      Cargando…
    </p>
  );
}

// Capa que exige sesión y consentimiento aceptado para rendirizar los hijos.
function ProtectedWithConsent() {
  return (
    <ProtectedRoute>
      <ConsentGate>
        <Outlet />
      </ConsentGate>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <QueryProvider>
      <SyncProvider>
        <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<Cargando />}>
          <Routes>
            <Route path="/sign-in" element={<SignInPage />} />
            <Route path="/sign-up" element={<SignUpPage />} />

            {/* Sesión requerida; el consent gate decide si redirige a /consent. */}
            <Route element={<ProtectedWithConsent />}>
              <Route path="/consent" element={<ConsentPage />} />
              <Route path="/" element={<PatientsPage />} />
              <Route path="/patients/new" element={<PatientNewPage />} />
              <Route path="/patients/:id" element={<PatientDetailPage />} />
              <Route path="/patients/:id/turnos" element={<PatientTurnosPage />} />
              <Route path="/patients/:id/medicamentos" element={<PatientMedicamentosPage />} />
              <Route path="/patients/:id/asistente" element={<PatientAsistentePage />} />
              <Route path="/patients/:id/resumenes" element={<PatientResumenesPage />} />
              <Route path="/patients/:id/resumenes/:sid" element={<ResumenImprimirPage />} />
              <Route path="/patients/:id/red" element={<PatientRedPage />} />
              <Route path="/centros" element={<CentrosPage />} />
              <Route path="/me" element={<ProfilePage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
      </SyncProvider>
    </QueryProvider>
  );
}
