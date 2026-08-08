import type { HomeContent } from "@/lib/content";
import { SlashLabel } from "./SlashLabel";

export function SiteHeader({ home }: { home: HomeContent }) {
  return (
    <header className="site-header pointer-events-none absolute inset-x-0 top-0 z-40 grid grid-cols-[1fr_auto_1fr] items-start gap-x-[var(--spacing-sm)] px-[var(--spacing-m)] py-[var(--spacing-m)] sm:px-[var(--spacing-l)]">
      <button className="nav-label slash-interaction pointer-events-auto justify-self-start" type="button">
        <SlashLabel>{home.workLabel}</SlashLabel>
      </button>

      <p className="site-intro max-w-[327px] text-center font-mono-display text-[14px] leading-5 tracking-[0.15em] uppercase">
        {home.intro}
      </p>

      <button className="nav-label slash-interaction pointer-events-auto justify-self-end" type="button">
        <SlashLabel>{home.aboutLabel}</SlashLabel>
      </button>
    </header>
  );
}
