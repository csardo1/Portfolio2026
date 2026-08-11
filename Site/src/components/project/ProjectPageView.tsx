import type { CSSProperties } from "react";
import type { HomeContent, Project } from "@/lib/content";
import { ProjectCarousel } from "./ProjectCarousel";
import { ProjectHeader } from "./ProjectHeader";
import { ProjectNavigation } from "./ProjectNavigation";
import { ViewportMarks } from "@/components/ViewportMarks";

type PageColorStyle = CSSProperties & {
  "--page-background": string;
  "--page-foreground": string;
  "--page-crop-marks": string;
  "--page-asterisk": string;
  "--page-image-border": string;
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
        imageBorder: project.imageBorderColor,
      }
    : {
        background: home.projectPageBackgroundColor,
        foreground: home.projectPageTextStrokeColor,
        cropMarks: home.projectPageCropMarkColor,
        asterisk: home.projectPageAsteriskColor,
        imageBorder: home.projectPageImageBorderColor,
      };
  const pageColorStyle = {
    "--page-background": colors.background,
    "--page-foreground": colors.foreground,
    "--page-crop-marks": colors.cropMarks,
    "--page-asterisk": colors.asterisk,
    "--page-image-border": colors.imageBorder,
  } as PageColorStyle;

  return (
    <main className="project-page" style={pageColorStyle}>
      <div className="project-page-shell">
        <ViewportMarks />
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
