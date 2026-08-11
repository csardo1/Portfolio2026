import type { HomeView } from "@/lib/content";
import { AsteriskLabel } from "@/components/AsteriskLabel";

type ViewSwitcherProps = {
  view: HomeView;
  onChange: (view: HomeView) => void;
};

export function ViewSwitcher({ view, onChange }: ViewSwitcherProps) {
  return (
    <div className="view-switcher pointer-events-none absolute z-[70]" role="group" aria-label="Project display">
      {(["grid", "index"] as const).map((option) => (
        <button
          className={`view-control asterisk-interaction pointer-events-auto ${view === option ? "is-active" : ""}`}
          type="button"
          aria-pressed={view === option}
          key={option}
          onClick={() => onChange(option)}
        >
          <AsteriskLabel markerPosition="after">{option}</AsteriskLabel>
        </button>
      ))}
    </div>
  );
}
