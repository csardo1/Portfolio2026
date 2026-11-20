export const viewportMarkPositions = [
  "top-left",
  "top-center",
  "top-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
] as const;

export type ViewportMarkPosition = (typeof viewportMarkPositions)[number];

export function ViewportMarks({ className = "" }: { className?: string } = {}) {
  return (
    <div aria-hidden="true" className={`viewport-marks ${className}`}>
      {viewportMarkPositions.map((position) => {
        const shape = position.endsWith("-center") ? "center" : "corner";
        return (
          <span className={`viewport-mark viewport-mark-${shape} viewport-mark-${position}`} key={position}>
            <span className="viewport-mark-glyph" />
          </span>
        );
      })}
    </div>
  );
}
