import Link from "next/link";
import type { HomeContent } from "@/lib/content";
import { AboutWindow } from "@/components/AboutWindow";
import { AsteriskLabel } from "@/components/AsteriskLabel";

export function SiteHeader({ home }: { home: HomeContent }) {
  return (
    <header className="site-header pointer-events-none absolute inset-0 z-[70]">
      <Link
        aria-current="page"
        className="nav-label site-nav-work asterisk-interaction is-active pointer-events-auto"
        href="/"
      >
        <AsteriskLabel>{home.workLabel}</AsteriskLabel>
      </Link>

      <AboutWindow
        className="nav-label site-nav-about asterisk-interaction pointer-events-auto"
        label={home.aboutLabel}
      />

      <p className="site-intro pointer-events-auto">
        {home.intro}
      </p>
    </header>
  );
}
