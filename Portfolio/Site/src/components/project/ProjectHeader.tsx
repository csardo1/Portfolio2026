import Link from "next/link";
import type { HomeContent, Project } from "@/lib/content";
import { AsteriskLabel } from "@/components/AsteriskLabel";

export function ProjectHeader({
  home,
  project,
}: {
  home: HomeContent;
  project: Project;
}) {
  return (
    <header className="project-header">
      <div className="project-heading">
        <h1>{project.title}</h1>
        <p>{project.tags.join(" – ")}</p>
      </div>

      <Link
        className="nav-label asterisk-interaction project-work-link"
        href="/"
      >
        <AsteriskLabel>{home.workLabel}</AsteriskLabel>
      </Link>

      <button
        className="nav-label asterisk-interaction project-about-button"
        type="button"
      >
        <AsteriskLabel>{home.aboutLabel}</AsteriskLabel>
      </button>
    </header>
  );
}
