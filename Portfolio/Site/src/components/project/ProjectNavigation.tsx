import Link from "next/link";
import type { Project } from "@/lib/content";
import { AsteriskLabel } from "@/components/AsteriskLabel";

export function ProjectNavigation({
  nextProject,
  previousProject,
}: {
  nextProject: Project;
  previousProject: Project;
}) {
  return (
    <nav className="project-navigation" aria-label="Adjacent projects">
      <Link
        aria-label={`Previous project: ${previousProject.title}`}
        className="project-navigation-link asterisk-interaction is-previous"
        href={`/${previousProject.slug}`}
      >
        <AsteriskLabel markerPosition="after">Previous Project</AsteriskLabel>
      </Link>

      <Link
        aria-label={`Next project: ${nextProject.title}`}
        className="project-navigation-link asterisk-interaction is-next"
        href={`/${nextProject.slug}`}
      >
        <AsteriskLabel>Next Project</AsteriskLabel>
      </Link>
    </nav>
  );
}
