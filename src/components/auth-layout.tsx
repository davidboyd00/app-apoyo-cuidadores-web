import type { ReactNode } from "react";

import s from "../styles/auth.module.css";
import { LogoMark } from "./logo";

/** Tarjeta centrada para login, registro y consentimiento. */
export function AuthLayout({
  title,
  subtitle,
  wide = false,
  children,
  footer,
}: {
  title: string;
  subtitle?: ReactNode;
  wide?: boolean;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className={s.wrap}>
      <div className={`card stack ${s.card} ${wide ? s.cardWide : ""}`}>
        <div className={s.brand}>
          <LogoMark />
          <span className={s.brandName}>Cuidadores</span>
        </div>
        <div className="stack-sm">
          <h1>{title}</h1>
          {subtitle && <p className="muted">{subtitle}</p>}
        </div>
        {children}
        {footer && <div className={`small ${s.footer}`}>{footer}</div>}
      </div>
    </main>
  );
}
