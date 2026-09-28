import type { ReactNode } from "react";
import { publicAssetPath } from "@/lib/asset-path";

type SlashLabelProps = {
  children: ReactNode;
  className?: string;
};

export function SlashLabel({ children, className = "" }: SlashLabelProps) {
  return (
    <span className={`slash-label ${className}`.trim()}>
      <span className="slash-marker" aria-hidden="true">
        <img
          className="slash-marker-line"
          src={publicAssetPath("/icons/slash-default.svg")}
          alt=""
          width="14"
          height="14"
        />
      </span>
      <span>{children}</span>
    </span>
  );
}
