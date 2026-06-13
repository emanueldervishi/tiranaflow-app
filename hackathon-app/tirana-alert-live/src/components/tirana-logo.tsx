export function TiranaLogo({ size = 40, className = "" }: { size?: number; className?: string }) {
  return (
    <div
      className={`relative grid place-items-center rounded-2xl bg-foreground text-background ${className}`}
      style={{
        width: size,
        height: size,
        boxShadow: "0 10px 24px -10px oklch(0 0 0 / 0.5)",
      }}
    >
      <svg viewBox="0 0 24 24" width={size * 0.55} height={size * 0.55} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 21s-7-7.5-7-13a7 7 0 0 1 14 0c0 5.5-7 13-7 13Z" />
        <circle cx="12" cy="8.5" r="2.4" fill="currentColor" stroke="none" />
      </svg>
    </div>
  );
}
