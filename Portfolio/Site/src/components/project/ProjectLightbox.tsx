"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { ProjectMedia } from "@/lib/content";
import { ViewportMarks } from "@/components/ViewportMarks";

export function ProjectLightbox({ media, activeIndex, projectTitle, onClose }: {
  media: ProjectMedia[];
  activeIndex: number;
  projectTitle: string;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const stripRef = useRef<HTMLElement>(null);
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
    const item = strip?.querySelectorAll<HTMLElement>(".project-lightbox-slide")[index];
    if (!strip || !item) return;
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    const anchor = strip.querySelectorAll<HTMLElement>(".project-lightbox-slide")[currentIndexRef.current];
    const anchorLeft = anchor.getBoundingClientRect().left;
    const peek = Math.min(100, (strip.clientWidth - 124) / 2);
    const gap = Math.max(12, (strip.clientWidth - item.offsetWidth) / 2 - peek);
    strip.style.setProperty("--lightbox-gap", `${gap}px`);
    // Preserve the current image's position while updating the spacing.
    const anchorShift = anchor.getBoundingClientRect().left - anchorLeft;
    if (Math.abs(anchorShift) > 0.5) strip.scrollLeft += anchorShift;
    const start = strip.scrollLeft;
    const target = start + item.getBoundingClientRect().left -
      strip.getBoundingClientRect().left + item.offsetWidth / 2 - strip.clientWidth / 2;
    currentIndexRef.current = index;
    setCurrentIndex(index);
    if (Math.abs(target - start) <= 1) return;
    if (behavior !== "smooth") {
      strip.scrollLeft = target;
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
    if (!dialog || !strip) return;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog.showModal();
    strip.focus({ preventScroll: true });
    document.body.style.overflow = "hidden";
    centerOn(activeIndex, "instant");

    const observer = new ResizeObserver(() => centerOn(currentIndexRef.current, "instant"));
    observer.observe(strip);
    strip.querySelectorAll(".project-lightbox-slide").forEach((item) => observer.observe(item));
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

  return (
    <dialog
      aria-label={`${projectTitle} media viewer`}
      className="project-lightbox"
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
          const center = strip.getBoundingClientRect().left + strip.clientWidth / 2;
          let nearest = 0;
          let distance = Infinity;
          strip.querySelectorAll<HTMLElement>(".project-lightbox-slide").forEach((item, index) => {
            const rect = item.getBoundingClientRect();
            const offset = Math.abs(rect.left + rect.width / 2 - center);
            if (offset < distance) { nearest = index; distance = offset; }
          });
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
              style={{ "--lightbox-aspect-ratio": videoRatios[item.src] ?? item.aspectRatio } as CSSProperties}
            >
              {item.type === "image" ? (
                <Image alt={item.alt} className="object-cover" fill sizes="100vw" src={item.src} />
              ) : (
                <video
                  aria-label={item.alt}
                  autoPlay
                  className="project-media-video"
                  controls={currentIndex === index}
                  loop muted playsInline
                  onLoadedMetadata={(event) => {
                    const video = event.currentTarget;
                    if (item.aspectRatioLabel === "Default" && video.videoWidth && video.videoHeight) {
                      setVideoRatios((ratios) => ({ ...ratios, [item.src]: `${video.videoWidth} / ${video.videoHeight}` }));
                    }
                  }}
                  poster={item.poster}
                  preload="metadata"
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
