"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { Project } from "@/lib/content";
import { AsteriskLabel } from "@/components/AsteriskLabel";

const indexAnimationResetDelay = 500;
const indexWaveWidths = [
  { stepCount: "24", width: "var(--spacing-l)" },
  { stepCount: "36", width: "var(--spacing-xl)" },
  { stepCount: "48", width: "var(--spacing-xxl)" },
];
const indexWaveTypes = ["sine", "sawtooth", "square", "triangle"] as const;

type IndexWaveType = (typeof indexWaveTypes)[number];

type IndexWaveStyle = CSSProperties & {
  "--wave-direction": "normal" | "reverse";
  "--wave-duration": string;
  "--wave-height": string;
  "--wave-step-count": string;
  "--wave-width": string;
};

type IndexWaveProfile = {
  style: IndexWaveStyle;
  type: IndexWaveType;
};

function getIndexWaveProfile(projectIndex: number): IndexWaveProfile {
  const waveWidth =
    indexWaveWidths[(projectIndex * 2) % indexWaveWidths.length];

  return {
    type: indexWaveTypes[projectIndex % indexWaveTypes.length],
    style: {
      "--wave-direction": projectIndex % 2 === 0 ? "normal" : "reverse",
      "--wave-duration": `${560 + projectIndex * 83}ms`,
      "--wave-height":
        projectIndex % 3 === 1 ? "var(--spacing-xs)" : "var(--spacing-sm)",
      "--wave-step-count": waveWidth.stepCount,
      "--wave-width": waveWidth.width,
    },
  };
}

export function IndexView({ projects }: { projects: Project[] }) {
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [revealingSlug, setRevealingSlug] = useState<string | null>(null);
  const [isExiting, setIsExiting] = useState(false);
  const activeSlugRef = useRef<string | null>(null);
  const animationReady = useRef(true);
  const animationResetTimer = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  function clearAnimationResetTimer() {
    if (animationResetTimer.current) {
      clearTimeout(animationResetTimer.current);
      animationResetTimer.current = null;
    }
  }

  function activateProject(projectSlug: string) {
    clearAnimationResetTimer();
    setIsExiting(false);

    if (activeSlugRef.current === projectSlug) return;

    activeSlugRef.current = projectSlug;
    const shouldReveal = animationReady.current;

    if (shouldReveal) {
      animationReady.current = false;
    }

    setRevealingSlug(shouldReveal ? projectSlug : null);
    setActiveSlug(projectSlug);
  }

  function scheduleAnimationReset() {
    clearAnimationResetTimer();
    animationResetTimer.current = setTimeout(() => {
      animationReady.current = true;
      animationResetTimer.current = null;
      setRevealingSlug(null);

      if (activeSlugRef.current !== null) {
        activeSlugRef.current = null;
        setIsExiting(true);
      }
    }, indexAnimationResetDelay);
  }

  useEffect(
    () => () => {
      clearAnimationResetTimer();
    },
    [],
  );

  return (
    <section
      className="home-view index-view relative flex min-h-0 w-full flex-1 items-center overflow-hidden"
      aria-label="Project index"
      onMouseLeave={scheduleAnimationReset}
    >
      <div className="relative mx-auto w-full max-w-[1368px] px-[var(--spacing-m)] py-[var(--spacing-xl)] sm:px-[var(--spacing-l)]">
        <ul className="relative flex flex-col gap-[var(--spacing-m)] sm:gap-[var(--spacing-l)]">
          {projects.map((project, projectIndex) => {
            const isActive = project.slug === activeSlug;
            const waveProfile = getIndexWaveProfile(projectIndex);

            return (
              <li className="relative" key={project.slug}>
                <Link
                  className="index-row asterisk-interaction group grid w-full grid-cols-[auto_1fr_auto] items-center gap-[var(--spacing-sm)] text-left focus-visible:outline-none"
                  href={`/${project.slug}`}
                  onBlur={scheduleAnimationReset}
                  onFocus={() => activateProject(project.slug)}
                  onMouseEnter={() => activateProject(project.slug)}
                  onMouseLeave={scheduleAnimationReset}
                  aria-label={`${project.title}: ${project.tags.join(", ")}`}
                >
                  <AsteriskLabel className="relative z-30 whitespace-nowrap bg-[var(--page-background)] pr-[var(--spacing-xs)] font-mono-display tracking-[0.1em] uppercase">
                    {project.title}
                  </AsteriskLabel>
                  <span
                    className="index-rule relative z-10 min-w-3"
                    aria-hidden="true"
                    data-wave-type={waveProfile.type}
                    style={waveProfile.style}
                  />
                  <span className="relative z-30 whitespace-nowrap bg-[var(--page-background)] pl-[var(--spacing-xs)] font-body capitalize">
                    {project.tags.join(" | ")}
                  </span>
                </Link>

                <span
                  aria-hidden={!isActive}
                  className={`index-preview pointer-events-none absolute left-1/2 top-1/2 z-40 w-[min(400px,34vw)] -translate-x-1/2 -translate-y-1/2 ${
                    isActive ? "opacity-100" : "opacity-0"
                  }`}
                  data-active={isActive || undefined}
                  data-exit={(isActive && isExiting) || undefined}
                  data-reveal={
                    (isActive && revealingSlug === project.slug) || undefined
                  }
                >
                  <span
                    className="index-preview-reveal block"
                    onAnimationEnd={() => {
                      if (isActive && isExiting) {
                        setActiveSlug(null);
                        setIsExiting(false);
                        return;
                      }

                      setRevealingSlug((currentSlug) =>
                        currentSlug === project.slug ? null : currentSlug,
                      );
                    }}
                  >
                    <span className="index-preview-media relative block aspect-square w-full overflow-hidden bg-[#d3d3d3]">
                      {isActive ? (
                        <Image
                          alt=""
                          className="object-cover"
                          fill
                          sizes="(max-width: 767px) 62vw, 400px"
                          src={project.coverUrl}
                        />
                      ) : null}
                    </span>
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
