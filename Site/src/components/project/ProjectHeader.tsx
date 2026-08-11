import Link from "next/link";
import type { HomeContent, Project } from "@/lib/content";
import { SlashLabel } from "@/components/home/SlashLabel";

export function ProjectHeader({
  home,
  project,
}: {
  home: HomeContent;
  project: Project;
}) {
  return (
    <header className="project-header">
      <Link
        className="nav-label slash-interaction project-work-link"
        href="/"
      >
        <SlashLabel>{home.workLabel}</SlashLabel>
      </Link>

      <div className="project-heading">
        <h1>{project.title}</h1>
        <p>{project.tags.join(" | ")}</p>
      </div>

      <button
        className="nav-label slash-interaction project-about-button"
        type="button"
      >
        <SlashLabel>{home.aboutLabel}</SlashLabel>
      </button>
    </header>
  );
}
