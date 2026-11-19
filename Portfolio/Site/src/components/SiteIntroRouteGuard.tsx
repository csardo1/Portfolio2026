"use client";

import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";

export function SiteIntroRouteGuard() {
  const pathname = usePathname();

  useLayoutEffect(() => {
    const { dataset } = document.documentElement;

    if (dataset.siteIntroPath !== window.location.pathname) {
      delete dataset.siteIntroPath;
    }
  }, [pathname]);

  return null;
}
