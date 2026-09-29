"use client";

import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { HomeContent, HomeView, Project } from "@/lib/content";
import { GridView } from "./GridView";
import type { DesktopGridSession } from "./GridView";
import { IndexView } from "./IndexView";
import { SiteHeader } from "./SiteHeader";
import { ViewSwitcher } from "./ViewSwitcher";
import { PageRootColors } from "@/components/PageRootColors";
import { ViewportMarks } from "@/components/ViewportMarks";
import { SiteIntro } from "@/components/SiteIntro";

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

export function PortfolioHome({ home, projects }: PortfolioHomeProps) {
  const [view, setView] = useState<HomeView>(home.defaultView);
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
  return (
    <main
      className="min-h-dvh bg-[var(--page-background)] text-[var(--page-foreground)]"
      style={pageColorStyle}
    >
      <PageRootColors
        asterisk={home.asteriskColor}
        background={home.backgroundColor}
        cropMarks={home.cropMarkColor}
        foreground={home.textStrokeColor}
      />
      <div className="relative flex min-h-dvh flex-col">
        <ViewportMarks className="page-viewport-marks" />
        <SiteHeader home={home} />

        <div className="relative flex min-h-0 flex-1 flex-col">
          <div className="home-view-frame relative flex min-h-0 flex-1 overflow-hidden">
            {view === "grid" ? (
              <GridView
                centerProject={home.centerProject}
                gridSession={desktopGridSession.current}
                key="grid"
                projects={projects}
              />
            ) : (
              <IndexView key="index" projects={projects} />
            )}
          </div>

          <ViewSwitcher view={view} onChange={setView} />
        </div>
      </div>
      <SiteIntro />
    </main>
  );
}
