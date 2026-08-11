import type { HomeView } from "@/lib/content";

type ViewSwitcherProps = {
  view: HomeView;
  onChange: (view: HomeView) => void;
};

export function ViewSwitcher({ view, onChange }: ViewSwitcherProps) {
  return (
    <div className="view-switcher pointer-events-none absolute inset-x-0 bottom-0 z-40 flex items-center justify-center gap-[var(--spacing-m)] px-[var(--spacing-l)] py-[var(--spacing-m)] sm:gap-[var(--spacing-l)] sm:py-[var(--spacing-l)]" role="group" aria-label="Project display">
      {(["grid", "index"] as const).map((option, index) => (
        <div className="flex items-center gap-[var(--spacing-m)] sm:gap-[var(--spacing-l)]" key={option}>
          {index > 0 ? <span className="h-3.5 w-px bg-[#050505]" aria-hidden="true" /> : null}
          <button
            className={`view-control pointer-events-auto font-mono-display tracking-[0.15em] uppercase ${view === option ? "is-active" : ""}`}
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
