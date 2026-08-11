import Link from "next/link";
import type { HomeContent } from "@/lib/content";
import { SlashLabel } from "./SlashLabel";

export function SiteHeader({ home }: { home: HomeContent }) {
  return (
    <header className="site-header pointer-events-none absolute inset-x-0 top-0 z-40 flex items-start justify-between px-[var(--spacing-m)] py-[var(--spacing-m)] sm:px-[var(--spacing-l)]">
      <Link
        aria-current="page"
        className="nav-label site-nav-work slash-interaction is-current pointer-events-auto"
        href="/"
      >
        <SlashLabel>{home.workLabel}</SlashLabel>
      </Link>

      <p className="site-intro absolute left-1/2 top-[var(--spacing-m)] w-[min(327px,50vw)] text-center font-mono-display tracking-[0.15em] uppercase">
        {home.intro}
      </p>

      <button className="nav-label site-nav-about slash-interaction pointer-events-auto" type="button">
        <SlashLabel>{home.aboutLabel}</SlashLabel>
      </button>
    </header>
  );
}
