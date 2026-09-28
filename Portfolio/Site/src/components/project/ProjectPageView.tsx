import type { CSSProperties } from "react";
import type { HomeContent, Project } from "@/lib/content";
import { ProjectCarousel } from "./ProjectCarousel";
import { ProjectHeader } from "./ProjectHeader";
import { ProjectNavigation } from "./ProjectNavigation";
import { ViewportMarks } from "@/components/ViewportMarks";
import { SiteIntro } from "@/components/SiteIntro";

type PageColorStyle = CSSProperties & {
  "--page-background": string;
  "--page-foreground": string;
  "--page-crop-marks": string;
  "--page-asterisk": string;
};

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
  const colors = project.customColors
    ? {
        background: project.backgroundColor,
        foreground: project.textStrokeColor,
        cropMarks: project.cropMarkColor,
        asterisk: project.asteriskColor,
      }
    : {
        background: home.projectPageBackgroundColor,
        foreground: home.projectPageTextStrokeColor,
        cropMarks: home.projectPageCropMarkColor,
        asterisk: home.projectPageAsteriskColor,
      };
  const pageColorStyle = {
    "--page-background": colors.background,
    "--page-foreground": colors.foreground,
    "--page-crop-marks": colors.cropMarks,
    "--page-asterisk": colors.asterisk,
  } as PageColorStyle;

  return (
    <main
      className="project-page"
      style={pageColorStyle}
    >
      <div className="project-page-shell">
        <ViewportMarks className="page-viewport-marks" />
        <ProjectHeader home={home} project={project} />
        <ProjectCarousel media={project.content} projectTitle={project.title} />
        <ProjectNavigation
          nextProject={nextProject}
          previousProject={previousProject}
        />
      </div>
      <SiteIntro />
    </main>
  );
}
