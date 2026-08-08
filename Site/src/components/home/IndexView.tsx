"use client";

import Image from "next/image";
import { useState } from "react";
import type { Project } from "@/lib/content";
import { SlashLabel } from "./SlashLabel";

export function IndexView({ projects }: { projects: Project[] }) {
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const activeProject = projects.find((project) => project.slug === activeSlug);

  return (
    <section
      className="home-view index-view relative flex min-h-0 w-full flex-1 items-center overflow-hidden"
      aria-label="Project index"
      onMouseLeave={() => setActiveSlug(null)}
    >
      <div className="relative mx-auto w-full max-w-[1368px] px-[var(--spacing-m)] py-[var(--spacing-xl)] sm:px-[var(--spacing-l)]">
        <div
          aria-hidden={!activeProject}
          className={`index-preview pointer-events-none absolute left-1/2 top-1/2 z-20 aspect-square w-[min(400px,34vw)] -translate-x-1/2 -translate-y-1/2 overflow-hidden border border-[#050505] bg-[#d3d3d3] transition-[opacity,transform] duration-300 ${
            activeProject ? "scale-100 opacity-100" : "scale-[0.96] opacity-0"
          }`}
        >
          {activeProject ? (
            <Image
              alt=""
              className="object-cover"
              fill
              sizes="(max-width: 767px) 62vw, 400px"
              src={activeProject.coverUrl}
            />
          ) : null}
        </div>

        <ul className="relative flex flex-col gap-[var(--spacing-m)] sm:gap-[var(--spacing-l)]">
          {projects.map((project) => (
            <li key={project.slug}>
              <button
                className="index-row slash-interaction group grid w-full grid-cols-[auto_1fr_auto] items-center gap-[var(--spacing-sm)] text-left focus-visible:outline-none"
                type="button"
                onBlur={() => setActiveSlug(null)}
                onFocus={() => setActiveSlug(project.slug)}
                onMouseEnter={() => setActiveSlug(project.slug)}
                aria-label={`${project.title}: ${project.tags.join(", ")}`}
              >
                <SlashLabel className="relative z-30 whitespace-nowrap bg-[#efefef] pr-[var(--spacing-xs)] font-mono-display text-[14px] leading-5 tracking-[0.15em] uppercase group-focus-visible:underline group-focus-visible:underline-offset-[var(--spacing-xs)]">
                  {project.title}
                </SlashLabel>
                <span className="relative z-10 h-px min-w-3 bg-[#050505]" aria-hidden="true" />
                <span className="relative z-30 whitespace-nowrap bg-[#efefef] pl-[var(--spacing-xs)] font-body text-xs leading-4 tracking-[0.05em] capitalize">
                  {project.tags.join(" | ")}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
