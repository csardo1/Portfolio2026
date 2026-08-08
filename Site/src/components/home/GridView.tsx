"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import type {
  CSSProperties,
  KeyboardEvent,
  PointerEvent,
  WheelEvent,
} from "react";
import type { GridSize, Project } from "@/lib/content";

type LayoutMode = "wide" | "compact";
type GridBreakpoint = "desktop" | "tablet" | "mobile";
type Distribution = "wide" | "square" | "tall";
type Point = { x: number; y: number };
type LayoutTile = Point & { size: number };
type TileLayout = Record<string, LayoutTile>;
type LayoutMetrics = {
  breakpoint: GridBreakpoint;
  distribution: Distribution;
  mode: LayoutMode;
  gap: number;
  captionHeight: number;
  panStep: number;
  viewportWidth: number;
  viewportHeight: number;
  safeTop: number;
  safeBottom: number;
};
type PlacedTile = LayoutTile & { slug: string };
type Obstacle = Point & { width: number; height: number };
type DragState = {
  pointerId: number;
  startPointer: Point;
  startPan: Point;
};
type TileStyle = CSSProperties & {
  "--tile-layer": number;
  "--tile-shift-y": string;
  "--tile-size": string;
};
type CanvasStyle = CSSProperties & {
  "--canvas-pan-x": string;
  "--canvas-pan-y": string;
};

const hoverIntentDelay = 160;
const tileSizes: Record<LayoutMode, Record<GridSize, number>> = {
  wide: { L: 424, M: 312, S: 200 },
  compact: { L: 280, M: 204, S: 128 },
};
const directionWeights: Record<Distribution, number[]> = {
  wide: [3, 1.5, 0.5, 1.5, 3, 1.5, 0.5, 1.5],
  square: [1, 1, 1, 1, 1, 1, 1, 1],
  tall: [0.5, 1.5, 3, 1.5, 0.5, 1.5, 3, 1.5],
};

function createRandom(seed: number) {
  let value = seed >>> 0;

  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], random: () => number) {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex],
      shuffled[index],
    ];
  }

  return shuffled;
}

function overlapsWithGap(
  candidate: LayoutTile,
  placedTiles: PlacedTile[],
  gap: number,
) {
  return placedTiles.some(
    (tile) =>
      candidate.x < tile.x + tile.size + gap &&
      candidate.x + candidate.size + gap > tile.x &&
      candidate.y < tile.y + tile.size + gap &&
      candidate.y + candidate.size + gap > tile.y,
  );
}

function overlapsMenuZone(candidate: LayoutTile, metrics: LayoutMetrics) {
  const viewportLeft = metrics.viewportWidth / -2;
  const viewportRight = metrics.viewportWidth / 2;
  const viewportTop = metrics.viewportHeight / -2;
  const viewportBottom = metrics.viewportHeight / 2;
  const candidateRight = candidate.x + candidate.size;
  const candidateBottom = candidate.y + candidate.size;
  const visibleHorizontally =
    candidateRight > viewportLeft && candidate.x < viewportRight;
  const outsideVerticalViewport =
    candidateBottom <= viewportTop || candidate.y >= viewportBottom;
  const insideSafeArea =
    candidate.y >= metrics.safeTop && candidateBottom <= metrics.safeBottom;

  return visibleHorizontally && !outsideVerticalViewport && !insideSafeArea;
}

function adjacentCandidates(
  anchor: PlacedTile,
  size: number,
  gap: number,
) {
  const verticalAlignments = [
    anchor.y,
    anchor.y + anchor.size - size,
  ];
  const horizontalAlignments = [
    anchor.x,
    anchor.x + anchor.size - size,
  ];

  return [
    ...verticalAlignments.flatMap((y) => [
      { x: anchor.x - size - gap, y, size },
      { x: anchor.x + anchor.size + gap, y, size },
    ]),
    ...horizontalAlignments.flatMap((x) => [
      { x, y: anchor.y - size - gap, size },
      { x, y: anchor.y + anchor.size + gap, size },
    ]),
  ];
}

function getDirectionSector(x: number, y: number) {
  const fullTurn = Math.PI * 2;
  const sectorSize = fullTurn / 8;
  const angle = (Math.atan2(y, x) + fullTurn + sectorSize / 2) % fullTurn;
  return Math.floor(angle / sectorSize);
}

function findSpiralPosition(
  size: number,
  placedTiles: PlacedTile[],
  metrics: LayoutMetrics,
  random: () => number,
) {
  const gap = metrics.gap;
  const largestSize = Math.max(size, ...placedTiles.map((tile) => tile.size));
  const startAngle = random() * Math.PI * 2;

  for (let attempt = 1; attempt < 10000; attempt += 1) {
    const radius = Math.sqrt(attempt) * (largestSize + gap);
    const angle = startAngle + attempt * 2.399963229728653;
    const candidate = {
      x: Math.round(Math.cos(angle) * radius - size / 2),
      y: Math.round(Math.sin(angle) * radius - size / 2),
      size,
    };

    if (
      !overlapsWithGap(candidate, placedTiles, gap) &&
      !overlapsMenuZone(candidate, metrics)
    ) {
      return candidate;
    }
  }

  const rightEdge = Math.max(
    ...placedTiles.map((tile) => tile.x + tile.size),
  );
  return {
    x: Math.max(rightEdge + gap, metrics.viewportWidth / 2 + gap),
    y: -size / 2,
    size,
  };
}

function createRandomLayout(
  projects: Project[],
  centerProject: string,
  metrics: LayoutMetrics,
  seed: number,
) {
  const random = createRandom(seed);
  const centeredProject =
    projects.find((project) => project.slug === centerProject) ?? projects[0];

  if (!centeredProject) return {};

  const centerSize = tileSizes[metrics.mode][centeredProject.gridSize];
  const centerTile: PlacedTile = {
    slug: centeredProject.slug,
    x: -centerSize / 2,
    y: -centerSize / 2,
    size: centerSize,
  };
  const placedTiles = [centerTile];
  const layout: TileLayout = {
    [centeredProject.slug]: centerTile,
  };
  const remainingProjects = shuffle(
    projects.filter((project) => project !== centeredProject),
    random,
  );

  for (const project of remainingProjects) {
    const size = tileSizes[metrics.mode][project.gridSize];
    const candidates = shuffle(
      placedTiles.flatMap((tile) =>
        adjacentCandidates(tile, size, metrics.gap),
      ),
      random,
    ).filter(
      (candidate) =>
        !overlapsWithGap(candidate, placedTiles, metrics.gap) &&
        !overlapsMenuZone(candidate, metrics),
    );

    const placedAroundCenter = placedTiles.filter(
      (tile) => tile.slug !== centeredProject.slug,
    );
    const sectorCounts = Array.from({ length: 8 }, () => 0);
    let centerSumX = 0;
    let centerSumY = 0;

    for (const tile of placedAroundCenter) {
      const centerX = tile.x + tile.size / 2;
      const centerY = tile.y + tile.size / 2;
      sectorCounts[getDirectionSector(centerX, centerY)] += 1;
      centerSumX += centerX;
      centerSumY += centerY;
    }

    const candidateSectorUtilization = candidates.map((candidate) => {
      const sector = getDirectionSector(
        candidate.x + candidate.size / 2,
        candidate.y + candidate.size / 2,
      );
      return (
        (sectorCounts[sector] + 1) /
        directionWeights[metrics.distribution][sector]
      );
    });
    const lowestAvailableSectorUtilization = candidateSectorUtilization.length
      ? Math.min(...candidateSectorUtilization)
      : 0;
    const balancedCandidates = candidates.filter(
      (_candidate, index) =>
        candidateSectorUtilization[index] ===
        lowestAvailableSectorUtilization,
    );
    const selected = balancedCandidates.length
      ? balancedCandidates
          .map((candidate) => {
            const centerX = candidate.x + candidate.size / 2;
            const centerY = candidate.y + candidate.size / 2;
            const radialDistance = Math.hypot(centerX, centerY);
            const projectedImbalance = Math.hypot(
              centerSumX + centerX,
              centerSumY + centerY,
            );

            return {
              candidate,
              score:
                radialDistance +
                projectedImbalance * 2 +
                random() * (size + metrics.gap),
            };
          })
          .sort((first, second) => first.score - second.score)[0].candidate
      : findSpiralPosition(size, placedTiles, metrics, random);
    const placedTile = { ...selected, slug: project.slug };

    placedTiles.push(placedTile);
    layout[project.slug] = selected;
  }

  return layout;
}

function horizontallyOverlaps(tile: LayoutTile, obstacle: Obstacle) {
  return (
    tile.x < obstacle.x + obstacle.width &&
    tile.x + tile.size > obstacle.x
  );
}

function getRevealShifts(
  projects: Project[],
  layout: TileLayout,
  activeSlug: string | null,
  metrics: LayoutMetrics,
) {
  const shifts: Record<string, number> = {};
  if (!activeSlug || !layout[activeSlug]) return shifts;

  const activeTile = layout[activeSlug];
  const obstacles: Obstacle[] = [
    {
      x: activeTile.x,
      y: activeTile.y + activeTile.size + metrics.gap,
      width: activeTile.size,
      height: metrics.captionHeight,
    },
  ];
  const tilesBelowCaption = projects
    .filter((project) => project.slug !== activeSlug && layout[project.slug])
    .map((project) => ({ ...layout[project.slug], slug: project.slug }))
    .sort((first, second) => first.y - second.y);

  for (const tile of tilesBelowCaption) {
    let y = tile.y;
    let moved = true;

    while (moved) {
      moved = false;

      for (const obstacle of obstacles) {
        const positionedTile = { ...tile, y };
        const requiredTop = obstacle.y + obstacle.height + metrics.gap;

        if (
          horizontallyOverlaps(positionedTile, obstacle) &&
          y < requiredTop &&
          y + tile.size > obstacle.y
        ) {
          y = requiredTop;
          moved = true;
        }
      }
    }

    shifts[tile.slug] = y - tile.y;
    obstacles.push({
      x: tile.x,
      y,
      width: tile.size,
      height: tile.size,
    });
  }

  return shifts;
}

function getGridLayer(gridSize: GridSize) {
  if (gridSize === "L") return 19;
  if (gridSize === "M") return 18;
  return 17;
}

function readSpacingValue(styles: CSSStyleDeclaration, name: string, fallback: number) {
  const value = Number.parseFloat(styles.getPropertyValue(name));
  return Number.isFinite(value) ? value : fallback;
}

export function GridView({
  centerProject,
  projects,
}: {
  centerProject: string;
  projects: Project[];
}) {
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [layout, setLayout] = useState<TileLayout>({});
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [metrics, setMetrics] = useState<LayoutMetrics>({
    breakpoint: "desktop",
    distribution: "wide",
    mode: "compact",
    gap: 24,
    captionHeight: 72,
    panStep: 48,
    viewportWidth: 1280,
    viewportHeight: 720,
    safeTop: -240,
    safeBottom: 240,
  });
  const dragState = useRef<DragState | null>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const layoutSeed = useRef<number | null>(null);
  const projectKey = projects
    .map((project) => `${project.slug}:${project.gridSize}`)
    .join("|");

  const revealShifts = useMemo(
    () => getRevealShifts(projects, layout, activeSlug, metrics),
    [activeSlug, layout, metrics, projects],
  );

  function clearHoverTimer() {
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
  }

  function queueHover(projectSlug: string) {
    clearHoverTimer();
    hoverTimer.current = setTimeout(() => {
      setActiveSlug(projectSlug);
      hoverTimer.current = null;
    }, hoverIntentDelay);
  }

  function stopPanning(pointerId?: number) {
    if (pointerId !== undefined && dragState.current?.pointerId !== pointerId) {
      return;
    }

    dragState.current = null;
    setIsPanning(false);
  }

  function handlePointerDown(event: PointerEvent<HTMLElement>) {
    if (
      event.button !== 0 ||
      (event.target as HTMLElement).closest(".grid-tile")
    ) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    dragState.current = {
      pointerId: event.pointerId,
      startPointer: { x: event.clientX, y: event.clientY },
      startPan: pan,
    };
    setIsPanning(true);
  }

  function handlePointerMove(event: PointerEvent<HTMLElement>) {
    const drag = dragState.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    setPan({
      x: drag.startPan.x + event.clientX - drag.startPointer.x,
      y: drag.startPan.y + event.clientY - drag.startPointer.y,
    });
  }

  function handleWheel(event: WheelEvent<HTMLElement>) {
    event.preventDefault();
    setPan((currentPan) => ({
      x: currentPan.x - event.deltaX,
      y: currentPan.y - event.deltaY,
    }));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    const directions: Record<string, Point> = {
      ArrowDown: { x: 0, y: -metrics.panStep },
      ArrowLeft: { x: metrics.panStep, y: 0 },
      ArrowRight: { x: -metrics.panStep, y: 0 },
      ArrowUp: { x: 0, y: metrics.panStep },
    };
    const direction = directions[event.key];
    if (!direction) return;

    event.preventDefault();
    setPan((currentPan) => ({
      x: currentPan.x + direction.x,
      y: currentPan.y + direction.y,
    }));
  }

  useEffect(() => {
    function updateMetrics() {
      const styles = getComputedStyle(document.documentElement);
      const spacingM = readSpacingValue(styles, "--spacing-m", 18);
      const spacingL = readSpacingValue(styles, "--spacing-l", 24);
      const spacingXl = readSpacingValue(styles, "--spacing-xl", 36);
      const spacingXxl = readSpacingValue(styles, "--spacing-xxl", 48);
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const aspectRatio = viewportWidth / viewportHeight;
      const breakpoint: GridBreakpoint =
        viewportWidth <= 767
          ? "mobile"
          : viewportWidth <= 1099
            ? "tablet"
            : "desktop";
      const mode = viewportHeight <= 900 ? "compact" : "wide";
      const distribution: Distribution =
        aspectRatio > 1.2 ? "wide" : aspectRatio < 0.83 ? "tall" : "square";
      const gridViewport = document.querySelector(".grid-view");
      const header = document.querySelector(".site-header");
      const viewSwitcher = document.querySelector(
        '[role="group"][aria-label="Project display"]',
      );
      const gridBounds = gridViewport?.getBoundingClientRect();
      const headerBounds = header?.getBoundingClientRect();
      const switcherBounds = viewSwitcher?.getBoundingClientRect();
      const canvasWidth = gridBounds?.width ?? viewportWidth;
      const canvasHeight = gridBounds?.height ?? viewportHeight;
      const canvasTop = gridBounds?.top ?? 0;
      const safeTop =
        (headerBounds?.bottom ?? canvasTop) -
        canvasTop +
        spacingL -
        canvasHeight / 2;
      const safeBottom =
        (switcherBounds?.top ?? canvasTop + canvasHeight) -
        canvasTop -
        spacingL -
        canvasHeight / 2;
      const nextMetrics = {
        breakpoint,
        distribution,
        mode,
        gap: spacingL,
        captionHeight:
          mode === "compact" ? spacingXxl + spacingL : spacingXl + spacingM,
        panStep: spacingXxl,
        viewportWidth: canvasWidth,
        viewportHeight: canvasHeight,
        safeTop,
        safeBottom,
      } satisfies LayoutMetrics;

      setMetrics((currentMetrics) => {
        if (currentMetrics.breakpoint !== breakpoint) {
          requestAnimationFrame(updateMetrics);
        }

        return JSON.stringify(currentMetrics) === JSON.stringify(nextMetrics)
          ? currentMetrics
          : nextMetrics;
      });
    }

    updateMetrics();
    window.addEventListener("resize", updateMetrics);
    return () => window.removeEventListener("resize", updateMetrics);
  }, []);

  useEffect(() => {
    if (metrics.breakpoint !== "desktop") {
      setLayout({});
      setPan({ x: 0, y: 0 });
      setActiveSlug(null);
      return;
    }

    if (layoutSeed.current === null) {
      const seed = new Uint32Array(1);
      crypto.getRandomValues(seed);
      layoutSeed.current = seed[0];
    }

    setLayout(
      createRandomLayout(projects, centerProject, metrics, layoutSeed.current),
    );
    setPan({ x: 0, y: 0 });
    setActiveSlug(null);
  }, [centerProject, metrics, projectKey, projects]);

  useEffect(
    () => () => {
      clearHoverTimer();
    },
    [],
  );

  const canvasStyle = {
    "--canvas-pan-x": `${pan.x}px`,
    "--canvas-pan-y": `${pan.y}px`,
  } as CanvasStyle;

  if (metrics.breakpoint !== "desktop") {
    return (
      <section
        aria-label="Project grid"
        className="home-view grid-list-view min-h-0 w-full flex-1 overflow-y-auto"
        data-breakpoint={metrics.breakpoint}
      >
        <div className="grid-list">
          {projects.map((project) => (
            <button
              aria-label={`View ${project.title}: ${project.tags.join(", ")}`}
              className="grid-list-item"
              key={project.slug}
              type="button"
            >
              <span className="grid-list-media">
                <Image
                  alt={project.coverAlt}
                  className="object-cover"
                  fill
                  loading="eager"
                  sizes="(max-width: 767px) calc(100vw - 48px), calc((100vw - 72px) / 2)"
                  src={project.coverUrl}
                />
              </span>

              <span className="grid-list-caption">
                <span className="grid-tile-title">{project.title}</span>
                <span className="grid-tile-tags">
                  {project.tags.map((tag) => (
                    <span className="grid-tile-tag" key={tag}>
                      {tag}
                    </span>
                  ))}
                </span>
              </span>
            </button>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label="Project grid. Drag empty space, scroll, or use arrow keys to pan."
      className={`home-view grid-view relative min-h-0 w-full flex-1 overflow-hidden${isPanning ? " is-panning" : ""}`}
      onKeyDown={handleKeyDown}
      onPointerCancel={(event) => stopPanning(event.pointerId)}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={(event) => stopPanning(event.pointerId)}
      onWheel={handleWheel}
      tabIndex={0}
    >
      <div
        className="grid-canvas"
        data-ready={Object.keys(layout).length > 0 || undefined}
        style={canvasStyle}
      >
        {projects.map((project) => {
          const position = layout[project.slug];
          if (!position) return null;

          const isActive = project.slug === activeSlug;
          const shiftY = revealShifts[project.slug] ?? 0;

          return (
            <button
              aria-label={`View ${project.title}: ${project.tags.join(", ")}`}
              className="grid-tile bg-transparent"
              data-active={isActive || undefined}
              data-center={project.slug === centerProject || undefined}
              data-grid-size={project.gridSize}
              key={project.slug}
              onBlur={() => setActiveSlug(null)}
              onFocus={() => {
                clearHoverTimer();
                setActiveSlug(project.slug);
              }}
              onMouseEnter={() => queueHover(project.slug)}
              onMouseLeave={() => {
                clearHoverTimer();
                setActiveSlug((currentSlug) =>
                  currentSlug === project.slug ? null : currentSlug,
                );
              }}
              style={
                {
                  left: `${position.x}px`,
                  top: `${position.y}px`,
                  "--tile-layer": isActive
                    ? 30
                    : getGridLayer(project.gridSize),
                  "--tile-shift-y": `${shiftY}px`,
                  "--tile-size": `${position.size}px`,
                } as TileStyle
              }
              type="button"
            >
              <span className="grid-tile-media">
                <Image
                  alt={project.coverAlt}
                  className="object-cover"
                  fill
                  loading="eager"
                  sizes="(max-width: 1099px) 280px, (max-height: 900px) 280px, 424px"
                  src={project.coverUrl}
                />
              </span>

              <span className="grid-tile-caption" aria-hidden="true">
                <span className="grid-tile-title">{project.title}</span>
                <span className="grid-tile-tags">
                  {project.tags.map((tag) => (
                    <span className="grid-tile-tag" key={tag}>
                      {tag}
                    </span>
                  ))}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
