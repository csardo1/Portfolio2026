import Link from "next/link";
import type { Project } from "@/lib/content";

function ArrowIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <img
      alt=""
      aria-hidden="true"
      className="project-navigation-arrow"
      height="14"
      src={`/icons/arrow-${direction}.svg`}
      width="14"
    />
  );
}

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
        className="project-navigation-link is-previous"
        href={`/${previousProject.slug}`}
      >
        <ArrowIcon direction="left" />
        <span>Previous Project</span>
      </Link>

      <Link
        aria-label={`Next project: ${nextProject.title}`}
        className="project-navigation-link is-next"
        href={`/${nextProject.slug}`}
      >
        <span>Next Project</span>
        <ArrowIcon direction="right" />
      </Link>
    </nav>
  );
}
