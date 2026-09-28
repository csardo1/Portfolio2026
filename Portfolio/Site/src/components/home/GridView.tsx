"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  CSSProperties,
  KeyboardEvent,
  PointerEvent,
  WheelEvent,
} from "react";
import type { GridSize, Project } from "@/lib/content";

type LayoutMode = "wide" | "compact";
type GridBreakpoint = "desktop" | "tablet" | "mobile";
type Point = { x: number; y: number };
type LayoutTile = Point & { size: number };
type TileLayout = Record<string, LayoutTile>;
type LayoutMetrics = {
  breakpoint: GridBreakpoint;
  mode: LayoutMode;
  gap: number;
  captionHeight: number;
  panStep: number;
  viewportWidth: number;
  viewportHeight: number;
  blockedZones: Obstacle[];
};
type SectorWeights = readonly [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];
type DesktopLayoutMetrics = LayoutMetrics & {
  sectorWeights: SectorWeights;
};
export type DesktopGridSession = {
  metrics: DesktopLayoutMetrics | null;
  seed: number | null;
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
const tileLoadStagger = 85;
const tileSizes: Record<LayoutMode, Record<GridSize, number>> = {
  wide: { L: 424, M: 312, S: 200 },
  compact: { L: 280, M: 204, S: 128 },
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
  const candidateRight = candidate.x + candidate.size;
  const candidateBottom = candidate.y + candidate.size;

  return metrics.blockedZones.some(
    (zone) =>
      candidate.x < zone.x + zone.width &&
      candidateRight > zone.x &&
      candidate.y < zone.y + zone.height &&
      candidateBottom > zone.y,
  );
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

function getAspectSectorWeights(aspectRatio: number): SectorWeights {
  const clampedRatio = Math.min(2, Math.max(0.5, aspectRatio));
  const orientation = Math.log2(clampedRatio);
  const nearSquareLimit = Math.log2(1.25);
  const directionalStrength = Math.max(
    0,
    (Math.abs(orientation) - nearSquareLimit) / (1 - nearSquareLimit),
  );
  const landscapeBias = orientation > 0 ? directionalStrength : 0;
  const portraitBias = orientation < 0 ? directionalStrength : 0;
  const horizontalWeight = 1 + landscapeBias * 2.8;
  const verticalWeight = 1 + portraitBias * 2.8;
  const diagonalWeight = 1 + directionalStrength * 0.45;

  return [
    horizontalWeight,
    diagonalWeight,
    verticalWeight,
    diagonalWeight,
    horizontalWeight,
    diagonalWeight,
    verticalWeight,
    diagonalWeight,
  ];
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
  metrics: DesktopLayoutMetrics,
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
      return (sectorCounts[sector] + 1) / metrics.sectorWeights[sector];
    });
    const lowestAvailableSectorUtilization = candidateSectorUtilization.length
      ? Math.min(...candidateSectorUtilization)
      : 0;
    const balancedCandidates = candidates.filter(
      (_candidate, index) =>
        Math.abs(
          candidateSectorUtilization[index] -
            lowestAvailableSectorUtilization,
        ) < Number.EPSILON,
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

function getRadialLoadOrder(layout: TileLayout) {
  return Object.fromEntries(
    Object.entries(layout)
      .sort(([, first], [, second]) => {
        const firstDistance = Math.hypot(
          first.x + first.size / 2,
          first.y + first.size / 2,
        );
        const secondDistance = Math.hypot(
          second.x + second.size / 2,
          second.y + second.size / 2,
        );
        return firstDistance - secondDistance;
      })
      .map(([slug], index) => [slug, index]),
  ) as Record<string, number>;
}

function getListLoadOrder(projects: Project[], centerProject: string) {
  const centerIndex = Math.max(
    0,
    projects.findIndex((project) => project.slug === centerProject),
  );

  return Object.fromEntries(
    projects
      .map((project, index) => ({
        slug: project.slug,
        distance: Math.abs(index - centerIndex),
        index,
      }))
      .sort(
        (first, second) =>
          first.distance - second.distance || first.index - second.index,
      )
      .map((project, index) => [project.slug, index]),
  ) as Record<string, number>;
}

function readSpacingValue(styles: CSSStyleDeclaration, name: string, fallback: number) {
  const value = Number.parseFloat(styles.getPropertyValue(name));
  return Number.isFinite(value) ? value : fallback;
}

export function GridView({
  centerProject,
  gridSession,
  projects,
}: {
  centerProject: string;
  gridSession: DesktopGridSession;
  projects: Project[];
}) {
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [activeCaptionHeight, setActiveCaptionHeight] = useState(0);
  const [isPanning, setIsPanning] = useState(false);
  const [layout, setLayout] = useState<TileLayout>({});
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [metrics, setMetrics] = useState<LayoutMetrics>({
    breakpoint: "desktop",
    mode: "compact",
    gap: 24,
    captionHeight: 72,
    panStep: 48,
    viewportWidth: 1280,
    viewportHeight: 720,
    blockedZones: [],
  });
  const [desktopLayoutMetrics, setDesktopLayoutMetrics] =
    useState<DesktopLayoutMetrics | null>(() => gridSession.metrics);
  const dragState = useRef<DragState | null>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const desktopLayoutMetricsRef = useRef<DesktopLayoutMetrics | null>(
    gridSession.metrics,
  );
  const projectKey = projects
    .map((project) => `${project.slug}:${project.gridSize}`)
    .join("|");

  const revealShifts = useMemo(
    () => {
      const baseMetrics = desktopLayoutMetrics ?? metrics;

      return getRevealShifts(
        projects,
        layout,
        activeSlug,
        {
          ...baseMetrics,
          captionHeight: activeCaptionHeight || baseMetrics.captionHeight,
        },
      );
    },
    [
      activeCaptionHeight,
      activeSlug,
      desktopLayoutMetrics,
      layout,
      metrics,
      projects,
    ],
  );
  const radialLoadOrder = useMemo(() => getRadialLoadOrder(layout), [layout]);
  const listLoadOrder = useMemo(
    () => getListLoadOrder(projects, centerProject),
    [centerProject, projects],
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
      const breakpoint: GridBreakpoint =
        viewportWidth <= 767
          ? "mobile"
          : viewportWidth <= 1099
            ? "tablet"
            : "desktop";
      const mode = viewportHeight <= 900 ? "compact" : "wide";
      const gridViewport = document.querySelector(".grid-view");
      const gridBounds = gridViewport?.getBoundingClientRect();
      const canvasWidth = gridBounds?.width ?? viewportWidth;
      const canvasHeight = gridBounds?.height ?? viewportHeight;
      const canvasCenterX = (gridBounds?.left ?? 0) + canvasWidth / 2;
      const canvasCenterY = (gridBounds?.top ?? 0) + canvasHeight / 2;
      const blockedZones = [
        ...document.querySelectorAll(
          '.site-header .nav-label, .site-header .site-intro, [role="group"][aria-label="Project display"]',
        ),
      ].map((element) => {
        const bounds = element.getBoundingClientRect();
        return {
          x: bounds.left - canvasCenterX - spacingL,
          y: bounds.top - canvasCenterY - spacingL,
          width: bounds.width + spacingL + spacingL,
          height: bounds.height + spacingL + spacingL,
        };
      });
      const nextMetrics = {
        breakpoint,
        mode,
        gap: spacingL,
        captionHeight:
          mode === "compact" ? spacingXxl + spacingL : spacingXl + spacingM,
        panStep: spacingXxl,
        viewportWidth: canvasWidth,
        viewportHeight: canvasHeight,
        blockedZones,
      } satisfies LayoutMetrics;

      if (
        breakpoint === "desktop" &&
        desktopLayoutMetricsRef.current === null
      ) {
        const frozenDesktopMetrics = {
          ...nextMetrics,
          sectorWeights: getAspectSectorWeights(
            viewportWidth / viewportHeight,
          ),
        } satisfies DesktopLayoutMetrics;

        desktopLayoutMetricsRef.current = frozenDesktopMetrics;
        gridSession.metrics = frozenDesktopMetrics;
        setDesktopLayoutMetrics(frozenDesktopMetrics);
      }

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

    if (!desktopLayoutMetrics) return;

    if (gridSession.seed === null) {
      const seed = new Uint32Array(1);
      crypto.getRandomValues(seed);
      gridSession.seed = seed[0];
    }

    setLayout(
      createRandomLayout(
        projects,
        centerProject,
        desktopLayoutMetrics,
        gridSession.seed,
      ),
    );
    setPan({ x: 0, y: 0 });
    setActiveSlug(null);
  }, [
    centerProject,
    desktopLayoutMetrics,
    gridSession,
    metrics.breakpoint,
    projectKey,
    projects,
  ]);

  useEffect(
    () => () => {
      clearHoverTimer();
    },
    [],
  );

  useLayoutEffect(() => {
    if (!activeSlug || metrics.breakpoint !== "desktop") {
      setActiveCaptionHeight(0);
      return;
    }

    const activeTile = document.querySelector(
      `.grid-tile[data-project-slug="${CSS.escape(activeSlug)}"]`,
    );
    const caption = activeTile?.querySelector<HTMLElement>(
      ".grid-tile-caption",
    );
    if (!caption) return;

    const measuredHeight = Math.ceil(caption.getBoundingClientRect().height);
    setActiveCaptionHeight((currentHeight) =>
      currentHeight === measuredHeight ? currentHeight : measuredHeight,
    );
  }, [activeSlug, layout, metrics.breakpoint]);

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
            <Link
              aria-label={`View ${project.title}: ${project.tags.join(", ")}`}
              className="grid-list-item"
              data-project-slug={project.slug}
              href={`/${project.slug}`}
              key={project.slug}
              style={{
                animationDelay: `${listLoadOrder[project.slug] * tileLoadStagger}ms`,
              }}
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
            </Link>
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
            <Link
              aria-label={`View ${project.title}: ${project.tags.join(", ")}`}
              className="grid-tile bg-transparent"
              data-active={isActive || undefined}
              data-center={project.slug === centerProject || undefined}
              data-grid-size={project.gridSize}
              data-project-slug={project.slug}
              href={`/${project.slug}`}
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
                  animationDelay: `${radialLoadOrder[project.slug] * tileLoadStagger}ms`,
                  "--tile-layer": isActive
                    ? 30
                    : getGridLayer(project.gridSize),
                  "--tile-shift-y": `${shiftY}px`,
                  "--tile-size": `${position.size}px`,
                } as TileStyle
              }
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
            </Link>
          );
        })}
      </div>
    </section>
  );
}
