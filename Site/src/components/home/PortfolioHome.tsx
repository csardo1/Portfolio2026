"use client";

import { useRef, useState } from "react";
import type { HomeContent, HomeView, Project } from "@/lib/content";
import { GridView } from "./GridView";
import type { DesktopGridSession } from "./GridView";
import { IndexView } from "./IndexView";
import { SiteHeader } from "./SiteHeader";
import { ViewSwitcher } from "./ViewSwitcher";

type PortfolioHomeProps = {
  home: HomeContent;
  projects: Project[];
};

export function PortfolioHome({ home, projects }: PortfolioHomeProps) {
  const [view, setView] = useState<HomeView>(home.defaultView);
  const desktopGridSession = useRef<DesktopGridSession>({
    metrics: null,
    seed: null,
  });

  return (
    <main className="min-h-dvh bg-[#efefef] p-[var(--spacing-sm)] text-[#050505] sm:p-[var(--spacing-l)]">
      <div className="relative flex min-h-[calc(100dvh-24px)] flex-col border border-[#050505] sm:min-h-[calc(100dvh-48px)]">
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
    </main>
  );
}
