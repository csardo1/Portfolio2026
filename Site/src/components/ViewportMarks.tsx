const cornerMarks = [
  ["top-left", "viewport-mark-top-left"],
  ["top-right", "viewport-mark-top-right"],
  ["bottom-left", "viewport-mark-bottom-left"],
  ["bottom-right", "viewport-mark-bottom-right"],
] as const;

export function ViewportMarks() {
  return (
    <div aria-hidden="true" className="viewport-marks">
      {cornerMarks.map(([position, className]) => (
        <span
          className={`viewport-mark viewport-mark-corner ${className}`}
          key={position}
        >
          <span className="viewport-mark-glyph" />
        </span>
      ))}

      <span className="viewport-mark viewport-mark-center viewport-mark-top-center">
        <span className="viewport-mark-glyph" />
      </span>
      <span className="viewport-mark viewport-mark-center viewport-mark-bottom-center">
        <span className="viewport-mark-glyph" />
      </span>
    </div>
  );
}
