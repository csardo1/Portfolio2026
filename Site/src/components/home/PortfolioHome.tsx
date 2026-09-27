"use client";

import { useCallback, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { HomeContent, HomeView, Project } from "@/lib/content";
import { GridView } from "./GridView";
import type { DesktopGridSession } from "./GridView";
import { IndexView } from "./IndexView";
import { ProjectWindowOverlay } from "./ProjectWindowOverlay";
import type { ProjectWindowSourceRect } from "./ProjectWindowOverlay";
import { SiteHeader } from "./SiteHeader";
import { ViewSwitcher } from "./ViewSwitcher";
import { ViewportMarks } from "@/components/ViewportMarks";

type PortfolioHomeProps = {
  home: HomeContent;
  projects: Project[];
};

type PageColorStyle = CSSProperties & {
  "--page-background": string;
  "--page-foreground": string;
  "--page-crop-marks": string;
  "--page-asterisk": string;
};

type ActiveProjectWindow = {
  project: Project;
  sourceRect: ProjectWindowSourceRect;
};

export function PortfolioHome({ home, projects }: PortfolioHomeProps) {
  const [view, setView] = useState<HomeView>(home.defaultView);
  const [projectWindow, setProjectWindow] =
    useState<ActiveProjectWindow | null>(null);
  const projectWindowOpenerRef = useRef<string | null>(null);
  const desktopGridSession = useRef<DesktopGridSession>({
    metrics: null,
    seed: null,
  });
  const pageColorStyle = {
    "--page-background": home.backgroundColor,
    "--page-foreground": home.textStrokeColor,
    "--page-crop-marks": home.cropMarkColor,
    "--page-asterisk": home.asteriskColor,
  } as PageColorStyle;
  const projectWindowIndex = projectWindow
    ? projects.findIndex(
        (candidate) => candidate.slug === projectWindow.project.slug,
      )
    : -1;
  const previousProject =
    projectWindowIndex >= 0
      ? projects[(projectWindowIndex - 1 + projects.length) % projects.length]
      : null;
  const nextProject =
    projectWindowIndex >= 0
      ? projects[(projectWindowIndex + 1) % projects.length]
      : null;

  const openProjectWindow = useCallback(
    (project: Project, sourceRect: ProjectWindowSourceRect) => {
      projectWindowOpenerRef.current = project.slug;
      setProjectWindow({ project, sourceRect });
    },
    [],
  );

  const closeProjectWindow = useCallback(() => {
    const openerSlug = projectWindowOpenerRef.current;
    setProjectWindow(null);

    requestAnimationFrame(() => {
      if (!openerSlug) return;
      document
        .querySelector<HTMLElement>(`[data-project-slug="${openerSlug}"]`)
        ?.focus({ preventScroll: true });
    });
  }, []);

  return (
    <main
      className="min-h-dvh bg-[var(--page-background)] text-[var(--page-foreground)]"
      style={pageColorStyle}
    >
      <div
        aria-hidden={projectWindow ? true : undefined}
        className="home-underlay relative flex min-h-dvh flex-col"
        data-window-open={projectWindow ? true : undefined}
        inert={projectWindow ? true : undefined}
      >
        <ViewportMarks />
        <SiteHeader home={home} />

        <div className="relative flex min-h-0 flex-1 flex-col">
          <div className="home-view-frame relative flex min-h-0 flex-1 overflow-hidden">
            {view === "grid" ? (
              <GridView
                centerProject={home.centerProject}
                gridSession={desktopGridSession.current}
                key="grid"
                onOpenWindowProject={openProjectWindow}
                projects={projects}
              />
            ) : (
              <IndexView key="index" projects={projects} />
            )}
          </div>

          <ViewSwitcher view={view} onChange={setView} />
        </div>
      </div>

      {projectWindow && previousProject && nextProject ? (
        <ProjectWindowOverlay
          home={home}
          nextProject={nextProject}
          onClose={closeProjectWindow}
          previousProject={previousProject}
          project={projectWindow.project}
          sourceRect={projectWindow.sourceRect}
        />
      ) : null}
    </main>
  );
}
