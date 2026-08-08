import type { HomeView } from "@/lib/content";

type ViewSwitcherProps = {
  view: HomeView;
  onChange: (view: HomeView) => void;
};

export function ViewSwitcher({ view, onChange }: ViewSwitcherProps) {
  return (
    <div className="pointer-events-none absolute bottom-0 left-1/2 z-40 flex -translate-x-1/2 items-center justify-center gap-[var(--spacing-m)] px-[var(--spacing-l)] py-[var(--spacing-m)] sm:gap-[var(--spacing-l)] sm:py-[var(--spacing-l)]" role="group" aria-label="Project display">
      {(["grid", "index"] as const).map((option, index) => (
        <div className="flex items-center gap-[var(--spacing-m)] sm:gap-[var(--spacing-l)]" key={option}>
          {index > 0 ? <span className="h-3.5 w-px bg-[#050505]" aria-hidden="true" /> : null}
          <button
            className={`view-control pointer-events-auto font-mono-display text-[14px] leading-5 tracking-[0.15em] uppercase ${view === option ? "is-active" : ""}`}
            type="button"
            aria-pressed={view === option}
            onClick={() => onChange(option)}
          >
            {option}
          </button>
        </div>
      ))}
    </div>
  );
}
