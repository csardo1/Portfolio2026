"use client";

import { useEffect } from "react";

const pageColorProperties = [
  "--page-background",
  "--page-foreground",
  "--page-crop-marks",
  "--page-asterisk",
] as const;

export function PageRootColors({
  asterisk,
  background,
  cropMarks,
  foreground,
}: {
  asterisk: string;
  background: string;
  cropMarks: string;
  foreground: string;
}) {
  useEffect(() => {
    const root = document.documentElement;
    const previousValues = pageColorProperties.map((property) =>
      root.style.getPropertyValue(property),
    );
    const nextValues = [background, foreground, cropMarks, asterisk];

    pageColorProperties.forEach((property, index) => {
      root.style.setProperty(property, nextValues[index]);
    });

    return () => {
      pageColorProperties.forEach((property, index) => {
        const previousValue = previousValues[index];

        if (previousValue) {
          root.style.setProperty(property, previousValue);
        } else {
          root.style.removeProperty(property);
        }
      });
    };
  }, [asterisk, background, cropMarks, foreground]);

  return null;
}
