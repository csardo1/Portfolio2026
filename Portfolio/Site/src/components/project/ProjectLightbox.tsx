"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { ProjectMedia } from "@/lib/content";
import { ViewportMarks } from "@/components/ViewportMarks";
import { useSyncedVideoStart } from "./useSyncedVideoStart";

type SlidePosition = {
  scrollLeft: number;
  extraGap: number;
};

function applySpacing(strip: HTMLElement, positions: SlidePosition[]) {
  if (positions.length === 0) return 0;

  const scrollLeft = strip.scrollLeft;
  const next = positions.findIndex((position) => position.scrollLeft >= scrollLeft);
  const endIndex = next === -1 ? positions.length - 1 : next;
  const startIndex = next <= 0 ? endIndex : next - 1;
  const start = positions[startIndex];
  const end = positions[endIndex];
  const progress = startIndex === endIndex
    ? 0
    : (scrollLeft - start.scrollLeft) / (end.scrollLeft - start.scrollLeft);
  const eased = progress * progress * (3 - 2 * progress);

  // The track keeps fixed scroll targets. Only the visible spacing changes.
  strip.style.setProperty("--lightbox-position", String(startIndex + progress));
  strip.style.setProperty(
    "--lightbox-gap-extra",
    `${start.extraGap + (end.extraGap - start.extraGap) * eased}px`,
  );
  return progress < 0.5 ? startIndex : endIndex;
}

export function ProjectLightbox({ media, activeIndex, projectTitle, onClose }: {
  media: ProjectMedia[];
  activeIndex: number;
  projectTitle: string;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const stripRef = useRef<HTMLElement>(null);
  const positionsRef = useRef<SlidePosition[]>([]);
  const currentIndexRef = useRef(activeIndex);
  const animationRef = useRef<number | null>(null);
  const [currentIndex, setCurrentIndex] = useState(activeIndex);
  const [videoRatios, setVideoRatios] = useState<Record<string, string>>({});
  const wheelRef = useRef({ distance: 0, lastEvent: 0, lastNavigation: -500 });
  const maximumAspectRatio = Math.max(...media.map((item) => {
    const [width, height] = (videoRatios[item.src] ?? item.aspectRatio).split("/").map(Number);
    return width / height;
  }));

  const centerOn = useCallback((index: number, behavior: ScrollBehavior) => {
    const strip = stripRef.current;
    const positions = positionsRef.current;
    const target = positions[index]?.scrollLeft;
    if (!strip || target === undefined) return;
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    const start = strip.scrollLeft;
    currentIndexRef.current = index;
    setCurrentIndex(index);
    if (behavior !== "smooth" || target === start) {
      if (target !== start) strip.scrollLeft = target;
      applySpacing(strip, positions);
      return;
    }

    const startedAt = performance.now();
    function animate(now: number) {
      if (!strip) return;
      const progress = Math.min(1, (now - startedAt) / 460);
      const eased = progress < 0.5
        ? 4 * progress ** 3
        : 1 - (-2 * progress + 2) ** 3 / 2;
      strip.scrollLeft = start + (target - start) * eased;
      applySpacing(strip, positions);
      animationRef.current = progress < 1 ? requestAnimationFrame(animate) : null;
    }
    animationRef.current = requestAnimationFrame(animate);
  }, []);

  function navigate(direction: number) {
    centerOn(
      Math.max(0, Math.min(media.length - 1, currentIndexRef.current + direction)),
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    );
  }

  useEffect(() => {
    const dialog = dialogRef.current;
    const strip = stripRef.current;
    const track = strip?.querySelector<HTMLElement>(".project-lightbox-track");
    if (!dialog || !strip || !track) return;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog.showModal();
    strip.focus({ preventScroll: true });
    document.body.style.overflow = "hidden";
    const slides = Array.from(track.querySelectorAll<HTMLElement>(".project-lightbox-slide"));
    const layout = () => {
      const width = strip.clientWidth;
      const peek = Math.min(100, (width - 124) / 2);
      const trackStyle = getComputedStyle(track);
      const baseGap = Number.parseFloat(trackStyle.columnGap);
      let left = Number.parseFloat(trackStyle.paddingInlineStart);
      positionsRef.current = slides.map((slide) => {
        const slideWidth = slide.getBoundingClientRect().width;
        const scrollLeft = Math.round(left + (slideWidth - width) / 2);
        left += slideWidth + baseGap;
        return {
          scrollLeft,
          extraGap: Math.max(0, (width - slideWidth) / 2 - peek - baseGap),
        };
      });
      centerOn(currentIndexRef.current, "instant");
    };
    layout();

    const observer = new ResizeObserver(layout);
    observer.observe(strip);
    slides.forEach((slide) => observer.observe(slide));
    const settle = () => {
      if (animationRef.current !== null) return;
      centerOn(currentIndexRef.current,
        window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth");
    };
    strip.addEventListener("scrollend", settle);
    return () => {
      observer.disconnect();
      strip.removeEventListener("scrollend", settle);
      if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
      dialog.close();
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus({ preventScroll: true });
    };
  }, [activeIndex, centerOn]);

  useSyncedVideoStart(dialogRef, media);

  return (
    <dialog
      aria-label={`${projectTitle} media viewer`}
      className="project-lightbox"
      data-video-sync-scope
      style={{ "--lightbox-max-aspect-ratio": maximumAspectRatio } as CSSProperties}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onKeyDown={(event) => {
        if (event.target instanceof HTMLVideoElement) return;
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          navigate(event.key === "ArrowLeft" ? -1 : 1);
        }
      }}
      onWheel={(event) => {
        event.preventDefault();
        const now = performance.now();
        const gesture = wheelRef.current;
        if (now - gesture.lastEvent > 180) gesture.distance = 0;
        gesture.lastEvent = now;
        if (now - gesture.lastNavigation < 450) return;
        const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
        gesture.distance += delta * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1);
        if (Math.abs(gesture.distance) < 36) return;
        navigate(gesture.distance > 0 ? 1 : -1);
        gesture.distance = 0;
        gesture.lastNavigation = now;
      }}
      ref={dialogRef}
    >
      <ViewportMarks />
      <section
        aria-label={`${projectTitle} enlarged media`}
        className="project-lightbox-strip"
        onTouchMove={() => {
          if (animationRef.current !== null) {
            cancelAnimationFrame(animationRef.current);
            animationRef.current = null;
          }
        }}
        onScroll={() => {
          if (animationRef.current !== null) return;
          const strip = stripRef.current;
          if (!strip) return;
          const nearest = applySpacing(strip, positionsRef.current);
          currentIndexRef.current = nearest;
          setCurrentIndex(nearest);
        }}
        ref={stripRef}
        tabIndex={0}
      >
        <div className="project-lightbox-track">
          {media.map((item, index) => (
            <div
              className="project-lightbox-slide"
              key={`${item.src}-${index}`}
              style={{
                "--lightbox-aspect-ratio": videoRatios[item.src] ?? item.aspectRatio,
                "--lightbox-slide-index": index,
              } as CSSProperties}
            >
              {item.type === "image" ? (
                <Image alt={item.alt} className="object-cover" fill sizes="100vw" src={item.src} />
              ) : (
                <video
                  aria-label={item.alt}
                  autoPlay={!item.syncGroup}
                  className="project-media-video"
                  controls={currentIndex === index}
                  data-sync-group={item.syncGroup}
                  loop muted playsInline
                  onLoadedMetadata={(event) => {
                    const video = event.currentTarget;
                    if (item.aspectRatioLabel === "Default" && video.videoWidth && video.videoHeight) {
                      setVideoRatios((ratios) => ({ ...ratios, [item.src]: `${video.videoWidth} / ${video.videoHeight}` }));
                    }
                  }}
                  poster={item.poster}
                  preload={item.syncGroup ? "auto" : "metadata"}
                  src={item.src}
                />
              )}
              {index !== currentIndex ? (
                <button
                  aria-label={`View ${item.alt}`}
                  className="project-lightbox-select"
                  onClick={() => {
                    stripRef.current?.focus({ preventScroll: true });
                    centerOn(index, window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth");
                  }}
                  type="button"
                />
              ) : null}
            </div>
          ))}
        </div>
      </section>
      <span aria-live="polite" className="sr-only">
        {currentIndex + 1} / {media.length}: {media[currentIndex].alt}
      </span>
      <button className="project-lightbox-close" onClick={onClose} type="button">Close</button>
    </dialog>
  );
}
