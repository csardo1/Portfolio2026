"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { ProjectMedia } from "@/lib/content";
import { ProjectDecodingCaption } from "./ProjectDecodingCaption";

type ProjectMediaStyle = CSSProperties & {
  "--project-aspect-ratio": string;
  "--project-load-delay": string;
};

function hasCaption(item: ProjectMedia) {
  return Boolean(item.captionLabel || item.caption);
}

function SplitCaptionSource({ item }: { item: ProjectMedia }) {
  if (!hasCaption(item)) return null;

  return (
    <figcaption className="project-split-caption-source">
      {item.captionLabel ? (
        <span className="project-media-caption-label">
          {item.captionLabel}
        </span>
      ) : null}
      {item.caption ? (
        <p className="project-media-caption-body">{item.caption}</p>
      ) : null}
    </figcaption>
  );
}

function SplitCaptionSizer({ item }: { item: ProjectMedia }) {
  return (
    <div
      aria-hidden="true"
      className="project-split-caption project-split-caption-sizer"
    >
      {item.captionLabel ? (
        <span className="project-media-caption-label">
          {item.captionLabel}
        </span>
      ) : null}
      {item.caption ? (
        <p className="project-media-caption-body">{item.caption}</p>
      ) : null}
    </div>
  );
}

export function ProjectSplitStack({
  media,
  projectTitle,
}: {
  media: ProjectMedia[];
  projectTitle: string;
}) {
  const itemRefs = useRef<Array<HTMLElement | null>>([]);
  const captionedIndexes = useMemo(
    () =>
      media.flatMap((item, index) => (hasCaption(item) ? [index] : [])),
    [media],
  );
  const [activeCaptionIndex, setActiveCaptionIndex] = useState(
    captionedIndexes[0] ?? -1,
  );

  useEffect(() => {
    if (!captionedIndexes.length) return;

    let animationFrame: number | null = null;

    function updateActiveCaption() {
      animationFrame = null;
      const activationLine = window.innerHeight;
      let nextIndex = captionedIndexes[0];

      for (const index of captionedIndexes) {
        const item = itemRefs.current[index];
        if (!item || item.getBoundingClientRect().top > activationLine) break;
        nextIndex = index;
      }

      setActiveCaptionIndex((currentIndex) =>
        currentIndex === nextIndex ? currentIndex : nextIndex,
      );
    }

    function scheduleUpdate() {
      if (animationFrame !== null) return;
      animationFrame = requestAnimationFrame(updateActiveCaption);
    }

    updateActiveCaption();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);

    return () => {
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      if (animationFrame !== null) cancelAnimationFrame(animationFrame);
    };
  }, [captionedIndexes]);

  const activeCaption = media[activeCaptionIndex];

  return (
    <section
      aria-label={`${projectTitle} project media`}
      className="project-split-stack"
    >
      {activeCaption ? (
        <div className="project-split-caption-rail">
          {captionedIndexes.map((index) => (
            <SplitCaptionSizer
              item={media[index]}
              key={`caption-sizer-${index}-${media[index].src}`}
            />
          ))}
          <ProjectDecodingCaption
            className="project-split-caption"
            item={activeCaption}
            semantic={false}
          />
        </div>
      ) : null}

      {media.map((item, index) => {
        const mediaStyle: ProjectMediaStyle = {
          "--project-aspect-ratio": item.aspectRatio,
          "--project-load-delay": `${index * 85}ms`,
        };

        return (
          <figure
            className="project-split-item"
            data-placement={item.placement}
            key={`${item.src}-${index}`}
            ref={(node) => {
              itemRefs.current[index] = node;
            }}
            style={mediaStyle}
          >
            <SplitCaptionSource item={item} />
            <div className="project-media-frame project-split-media-frame">
              {item.type === "image" ? (
                <Image
                  alt={item.alt}
                  className="object-cover"
                  fill
                  loading={index < 2 ? "eager" : "lazy"}
                  sizes="(max-width: 767px) calc(100vw - 48px), 50vw"
                  src={item.src}
                />
              ) : (
                <video
                  aria-label={item.alt}
                  autoPlay
                  className="project-media-video"
                  loop
                  muted
                  playsInline
                  poster={item.poster}
                  preload={index < 2 ? "auto" : "metadata"}
                  src={item.src}
                />
              )}
            </div>
          </figure>
        );
      })}
    </section>
  );
}
