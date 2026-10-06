import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";

import { ConsentGate } from "./components/consent-gate";
import { ProtectedRoute } from "./components/protected-route";
import { AuthProvider } from "./providers/auth-provider";
import { QueryProvider } from "./providers/query-provider";
import ConsentPage from "./routes/consent";
import PatientDetailPage from "./routes/patient-detail";
import PatientNewPage from "./routes/patient-new";
import PatientsPage from "./routes/patients";
import SignInPage from "./routes/sign-in";
import SignUpPage from "./routes/sign-up";

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
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/sign-in" element={<SignInPage />} />
            <Route path="/sign-up" element={<SignUpPage />} />

            {/* Sesión requerida; el consent gate decide si redirige a /consent. */}
            <Route element={<ProtectedWithConsent />}>
              <Route path="/consent" element={<ConsentPage />} />
              <Route path="/" element={<PatientsPage />} />
              <Route path="/patients/new" element={<PatientNewPage />} />
              <Route path="/patients/:id" element={<PatientDetailPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryProvider>
  );
}
