/** Isotipo: un corazón sobre un círculo suave (cuidado compartido). */
export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden="true"
    >
      <circle cx="16" cy="16" r="15" fill="currentColor" opacity="0.14" />
      <path
        d="M16 25c-4.8-3-8-6.2-8-10a4.2 4.2 0 0 1 8-1.8A4.2 4.2 0 0 1 24 15c0 3.8-3.2 7-8 10z"
        fill="currentColor"
      />
    </svg>
  );
}
