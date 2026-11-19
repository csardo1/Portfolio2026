import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SiteIntroRouteGuard } from "@/components/SiteIntroRouteGuard";
import "./globals.css";

// Run before the first paint so an eligible load starts with the reveal closed.
const siteIntroScript = `
(() => {
  const homePath = document.currentScript.dataset.homePath;
  const { origin, pathname } = window.location;
  const [navigation] = performance.getEntriesByType("navigation");
  const referrer = document.referrer && new URL(document.referrer);
  const fromThisSite = referrer && referrer.origin === origin &&
    (referrer.pathname.startsWith(homePath) || referrer.pathname === homePath.slice(0, -1));
  const isEntry = (!navigation || navigation.type === "navigate") && !fromThisSite;
  const isHomeReload = navigation?.type === "reload" &&
    (pathname === homePath || pathname === homePath.slice(0, -1));

  if ((!isEntry && !isHomeReload) || matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const root = document.documentElement;
  root.dataset.siteIntroPath = pathname;

  function clearIntro() {
    delete root.dataset.siteIntroPath;
    document.removeEventListener("animationend", finishIntro);
  }

  function finishIntro(event) {
    if (event.animationName === "page-marks-appear") clearIntro();
  }

  document.addEventListener("animationend", finishIntro);
  window.addEventListener("pagehide", clearIntro, { once: true });
})();
`;

export const metadata: Metadata = {
  title: "Christopher Sardo — Designer",
  description: "Selected graphic and motion design work by Christopher Sardo.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          data-home-path={`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/`}
          dangerouslySetInnerHTML={{ __html: siteIntroScript }}
        />
      </head>
      <body>
        <SiteIntroRouteGuard />
        {children}
      </body>
    </html>
  );
}
