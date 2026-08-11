import type { ReactNode } from "react";

type AsteriskLabelProps = {
  children: ReactNode;
  className?: string;
  markerPosition?: "before" | "after";
};

export function AsteriskLabel({
  children,
  className = "",
  markerPosition = "before",
}: AsteriskLabelProps) {
  const marker = (
    <span aria-hidden="true" className="asterisk-marker">
      *
    </span>
  );

  return (
    <span
      className={`asterisk-label marker-${markerPosition} ${className}`.trim()}
    >
      {markerPosition === "before" ? marker : null}
      <span>{children}</span>
      {markerPosition === "after" ? marker : null}
    </span>
  );
}
