import Link from "next/link";
import type { HomeContent } from "@/lib/content";
import { AsteriskLabel } from "@/components/AsteriskLabel";

export function SiteHeader({ home }: { home: HomeContent }) {
  return (
    <header className="site-header pointer-events-none absolute inset-0 z-[70]">
      <p className="site-intro pointer-events-auto">
        {home.intro}
      </p>

      <Link
        aria-current="page"
        className="nav-label site-nav-work asterisk-interaction is-active pointer-events-auto"
        href="/"
      >
        <AsteriskLabel>{home.workLabel}</AsteriskLabel>
      </Link>

      <button className="nav-label site-nav-about asterisk-interaction pointer-events-auto" type="button">
        <AsteriskLabel>{home.aboutLabel}</AsteriskLabel>
      </button>
    </header>
  );
}
