"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent } from "react";
import type { HomeContent, Project } from "@/lib/content";
import { AsteriskLabel } from "@/components/AsteriskLabel";
import { ProjectVerticalScroll } from "@/components/project/ProjectVerticalScroll";

export type ProjectWindowSourceRect = {
  height: number;
  left: number;
  top: number;
  width: number;
};

type ProjectWindowStyle = CSSProperties & {
  "--project-window-background": string;
  "--project-window-foreground": string;
  "--project-window-asterisk": string;
  "--window-source-height": string;
  "--window-source-left": string;
  "--window-source-top": string;
  "--window-source-width": string;
};

export function ProjectWindowOverlay({
  home,
  nextProject,
  onClose,
  previousProject,
  project,
  sourceRect,
}: {
  home: HomeContent;
  nextProject: Project;
  onClose: () => void;
  previousProject: Project;
  project: Project;
  sourceRect: ProjectWindowSourceRect;
}) {
  const [isClosing, setIsClosing] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const isClosingRef = useRef(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const colors = project.customColors
    ? {
        asterisk: project.asteriskColor,
        background: project.backgroundColor,
        foreground: project.textStrokeColor,
      }
    : {
        asterisk: home.projectPageAsteriskColor,
        background: home.projectPageBackgroundColor,
        foreground: home.projectPageTextStrokeColor,
      };
  const windowStyle = {
    "--project-window-background": colors.background,
    "--project-window-foreground": colors.foreground,
    "--project-window-asterisk": colors.asterisk,
    "--window-source-height": `${sourceRect.height}px`,
    "--window-source-left": `${sourceRect.left}px`,
    "--window-source-top": `${sourceRect.top}px`,
    "--window-source-width": `${sourceRect.width}px`,
  } as ProjectWindowStyle;

  const requestClose = useCallback(() => {
    if (isClosingRef.current) return;

    isClosingRef.current = true;
    setIsClosing(true);
    closeTimerRef.current = setTimeout(onClose, 440);
  }, [onClose]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus({ preventScroll: true });

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") requestClose();
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, [requestClose]);

  function handleBackdropPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) requestClose();
  }

  return (
    <div
      aria-labelledby="project-window-title"
      aria-modal="true"
      className="project-window-overlay"
      data-closing={isClosing || undefined}
      onPointerDown={handleBackdropPointerDown}
      role="dialog"
      style={windowStyle}
    >
      <div className="project-window-frame">
        <div className="project-window-content">
          <header className="project-window-heading">
            <h2 id="project-window-title">{project.title}</h2>
            <p>{project.tags.join(" – ")}</p>
          </header>

          <ProjectVerticalScroll
            contained
            media={project.content}
            projectTitle={project.title}
          />
        </div>
      </div>

      <nav className="project-window-navigation" aria-label="Adjacent projects">
        <Link
          aria-label={`Previous project: ${previousProject.title}`}
          className="project-window-navigation-link asterisk-interaction is-previous"
          href={`/${previousProject.slug}`}
        >
          <AsteriskLabel markerPosition="after">Previous Project</AsteriskLabel>
        </Link>

        <Link
          aria-label={`Next project: ${nextProject.title}`}
          className="project-window-navigation-link asterisk-interaction is-next"
          href={`/${nextProject.slug}`}
        >
          <AsteriskLabel>Next Project</AsteriskLabel>
        </Link>
      </nav>

      <button
        className="project-window-close asterisk-interaction"
        onClick={requestClose}
        ref={closeButtonRef}
        type="button"
      >
        <AsteriskLabel>Close</AsteriskLabel>
      </button>
    </div>
  );
}
