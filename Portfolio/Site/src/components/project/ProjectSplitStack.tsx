"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { ProjectBlock, ProjectCaption } from "@/lib/content";
import { ProjectDecodingCaption } from "./ProjectDecodingCaption";
import { ProjectLightbox } from "./ProjectLightbox";
import { useSyncedVideoStart } from "./useSyncedVideoStart";

type ProjectMediaStyle = CSSProperties & {
  "--project-aspect-ratio": string;
  "--project-load-delay": string;
};

function SplitCaptionText({ item }: { item: ProjectCaption }) {
  return (
    <>
      {item.label ? (
        <span className="project-media-caption-label">
          {item.label}
        </span>
      ) : null}
      {item.text ? (
        <p className="project-media-caption-body">{item.text}</p>
      ) : null}
    </>
  );
}

export function ProjectSplitStack({
  blocks,
  projectTitle,
}: {
  blocks: ProjectBlock[];
  projectTitle: string;
}) {
  const stackRef = useRef<HTMLElement>(null);
  const captionRefs = useRef<Array<HTMLElement | null>>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const media = useMemo(() => blocks.filter((item) => item.type !== "caption"), [blocks]);
  const captions = useMemo(() => blocks.flatMap((item, index) => item.type === "caption" ? [{ item, index }] : []), [blocks]);
  const [activeCaptionIndex, setActiveCaptionIndex] = useState(blocks[0]?.type === "caption" ? 0 : -1);
  useSyncedVideoStart(stackRef, media);

  useEffect(() => {
    if (!captions.length) return;

    let animationFrame: number | null = null;

    function updateActiveCaption() {
      animationFrame = null;
      const activationLine = window.innerHeight * 0.75;
      let nextIndex = -1;

      for (const { index } of captions) {
        const item = captionRefs.current[index];
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
  }, [captions]);

  const activeCaption = blocks[activeCaptionIndex];
  let nextMediaIndex = 0;

  return (
    <section
      aria-label={`${projectTitle} project content`}
      className="project-split-stack"
      data-video-sync-scope
      ref={stackRef}
    >
      {activeCaption?.type === "caption" ? (
        <div className="project-split-caption-rail">
          {captions.map(({ item, index }) => (
            <div aria-hidden="true" className="project-split-caption project-split-caption-sizer" key={index}>
              <SplitCaptionText item={item} />
            </div>
          ))}
          <ProjectDecodingCaption
            className="project-split-caption"
            item={activeCaption}
            semantic={false}
          />
        </div>
      ) : null}

      {blocks.map((item, index) => {
        if (item.type === "caption") {
          return (
            <div
              className="project-split-caption-block"
              data-project-block="caption"
              key={`caption-${index}`}
              ref={(node) => { captionRefs.current[index] = node; }}
            >
              <div className="project-split-caption-source"><SplitCaptionText item={item} /></div>
            </div>
          );
        }
        const mediaIndex = nextMediaIndex++;
        const mediaStyle: ProjectMediaStyle = {
          "--project-aspect-ratio": item.aspectRatio,
          "--project-load-delay": `${mediaIndex * 85}ms`,
        };

        return (
          <figure
            className="project-split-item"
            data-placement={item.placement}
            data-project-block="media"
            key={`${item.src}-${index}`}
            style={mediaStyle}
          >
            <div className="project-media-frame project-split-media-frame">
              {item.type === "image" ? (
                <Image
                  alt={item.alt}
                  className="object-cover"
                  fill
                  loading={mediaIndex < 2 ? "eager" : "lazy"}
                  sizes="(max-width: 767px) calc(100vw - 48px), 50vw"
                  src={item.src}
                />
              ) : (
                <video
                  aria-label={item.alt}
                  autoPlay={!item.syncGroup}
                  className="project-media-video"
                  data-sync-group={item.syncGroup}
                  loop
                  muted
                  playsInline
                  poster={item.poster}
                  preload={item.syncGroup || mediaIndex < 2 ? "auto" : "metadata"}
                  src={item.src}
                />
              )}
              <button
                aria-haspopup="dialog"
                aria-label={`Enlarge ${item.alt}`}
                className="project-lightbox-trigger"
                onClick={() => setLightboxIndex(mediaIndex)}
                type="button"
              />
            </div>
          </figure>
        );
      })}
      {lightboxIndex !== null ? (
        <ProjectLightbox
          activeIndex={lightboxIndex}
          media={media}
          onClose={() => setLightboxIndex(null)}
          projectTitle={projectTitle}
        />
      ) : null}
    </section>
  );
}
