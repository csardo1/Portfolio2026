import type { HomeContent, Project } from "@/lib/content";
import { ProjectCarousel } from "./ProjectCarousel";
import { ProjectHeader } from "./ProjectHeader";
import { ProjectNavigation } from "./ProjectNavigation";

export function ProjectPageView({
  home,
  nextProject,
  previousProject,
  project,
}: {
  home: HomeContent;
  nextProject: Project;
  previousProject: Project;
  project: Project;
}) {
  return (
    <main className="project-page">
      <div className="project-page-shell">
        <ProjectHeader home={home} project={project} />
        <ProjectCarousel media={project.content} projectTitle={project.title} />
        <ProjectNavigation
          nextProject={nextProject}
          previousProject={previousProject}
        />
      </div>
    </main>
  );
}
