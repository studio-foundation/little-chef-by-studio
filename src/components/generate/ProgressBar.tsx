interface ProgressBarProps {
  current: number;
  total: number;
}

export function ProgressBar({ current, total }: ProgressBarProps) {
  const pct = total > 0 ? (current / total) * 100 : 0;

  return (
    <div className="mx-auto w-full max-w-sm">
      <div className="mb-2 flex justify-between text-sm text-[var(--color-text-muted)]">
        <span>
          {current} recette{current !== 1 ? "s" : ""} générée
          {current !== 1 ? "s" : ""}
        </span>
        <span className="font-semibold text-[var(--color-primary)]">
          {current}/{total}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-border)]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[var(--color-secondary)] to-[var(--color-primary)] transition-[width] duration-500 ease-in-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
