import { useSyncExternalStore } from "react";

// Match the phone layout media query in globals.css, including landscape phones.
const mobileConditions = [
  "(max-width: 767px)",
  "(max-height: 500px) and (hover: none) and (pointer: coarse)",
];

export const mobileLayoutQuery = mobileConditions.join(", ");

export function mobileImageSizes(widerWidth: string) {
  return [...mobileConditions.map((condition) => `${condition} calc(100vw - 48px)`), widerWidth].join(", ");
}

function subscribeToMobileLayout(onChange: () => void) {
  const query = window.matchMedia(mobileLayoutQuery);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

export function useMobileLayout() {
  return useSyncExternalStore(
    subscribeToMobileLayout,
    () => window.matchMedia(mobileLayoutQuery).matches,
    () => false,
  );
}
