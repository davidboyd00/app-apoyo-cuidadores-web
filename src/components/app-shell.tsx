import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import s from "../styles/shell.module.css";
import { AppHeader } from "./app-header";

/** Estructura común de las pantallas con sesión: header fijo, contenido y footer. */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className={s.shell}>
      <a href="#contenido" className={s.skipLink}>
        Saltar al contenido
      </a>
      <AppHeader />
      <main id="contenido" className={`container page stack ${s.main}`}>
        {children}
      </main>
      <footer className={s.footer}>
        <div className="container row-between">
          <span>Cuidadores · apoyo para quienes cuidan</span>
          {/* `?ver=1` deja leer la política aunque ya esté aceptada. */}
          <Link to="/consent?ver=1">Política de privacidad</Link>
        </div>
      </footer>
    </div>
  );
}
