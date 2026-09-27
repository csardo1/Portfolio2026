"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { ProjectMedia } from "@/lib/content";

type IndexedMedia = {
  index: number;
  item: ProjectMedia;
};

type MediaGroup = {
  caption?: IndexedMedia;
  items: IndexedMedia[];
};

type VerticalMediaStyle = CSSProperties & {
  "--vertical-project-aspect-ratio": string;
};

function hasCaption(item: ProjectMedia) {
  return Boolean(item.captionLabel || item.caption);
}

function createMediaGroups(media: ProjectMedia[]): MediaGroup[] {
  const groups: MediaGroup[] = [];
  let latestCaption: IndexedMedia | undefined;

  for (let index = 0; index < media.length; index += 1) {
    const first = { index, item: media[index] };
    const items = [first];
    const nextItem = media[index + 1];

    if (
      first.item.orientation === "portrait" &&
      nextItem?.orientation === "portrait"
    ) {
      items.push({ index: index + 1, item: nextItem });
      index += 1;
    }

    const groupCaption = items.find(({ item }) => hasCaption(item));
    if (groupCaption) latestCaption = groupCaption;

    groups.push({
      caption: groupCaption ?? latestCaption,
      items,
    });
  }

  return groups;
}

function VerticalProjectMedia({
  item,
  priority,
}: {
  item: ProjectMedia;
  priority: boolean;
}) {
  if (item.type === "video") {
    return (
      <video
        aria-label={item.alt}
        autoPlay
        className="vertical-project-media-video"
        loop
        muted
        playsInline
        poster={item.poster}
        preload={priority ? "auto" : "metadata"}
        src={item.src}
      />
    );
  }

  return (
    <Image
      alt={item.alt}
      className="object-cover"
      fill
      loading={priority ? "eager" : "lazy"}
      sizes="(max-width: 767px) calc(100vw - 48px), 50vw"
      src={item.src}
    />
  );
}

function ProjectCaption({ item }: { item: ProjectMedia }) {
  return (
    <>
      {item.captionLabel ? (
        <span className="project-media-caption-label">{item.captionLabel}</span>
      ) : null}
      {item.caption ? (
        <p className="project-media-caption-body">{item.caption}</p>
      ) : null}
    </>
  );
}

export function ProjectVerticalScroll({
  contained = false,
  media,
  projectTitle,
}: {
  contained?: boolean;
  media: ProjectMedia[];
  projectTitle: string;
}) {
  const groups = useMemo(() => createMediaGroups(media), [media]);
  const captions = useMemo(
    () =>
      media
        .map((item, index) => ({ index, item }))
        .filter(({ item }) => hasCaption(item)),
    [media],
  );
  const groupRefs = useRef<Array<HTMLDivElement | null>>([]);
  const mediaColumnRef = useRef<HTMLDivElement>(null);
  const [activeGroupIndex, setActiveGroupIndex] = useState(0);
  const activeCaptionIndex =
    groups[activeGroupIndex]?.caption?.index ?? captions[0]?.index;

  useEffect(() => {
    const elements = groupRefs.current.filter(
      (element): element is HTMLDivElement => element !== null,
    );
    if (elements.length === 0) return;
    const rootElement = contained ? mediaColumnRef.current : null;
    if (contained && !rootElement) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const rootBounds = rootElement?.getBoundingClientRect();
        const viewportCenter = rootBounds
          ? rootBounds.top + rootBounds.height / 2
          : window.innerHeight / 2;
        const closestEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((first, second) => {
            const firstCenter =
              first.boundingClientRect.top + first.boundingClientRect.height / 2;
            const secondCenter =
              second.boundingClientRect.top + second.boundingClientRect.height / 2;

            return (
              Math.abs(firstCenter - viewportCenter) -
              Math.abs(secondCenter - viewportCenter)
            );
          })[0];

        if (!closestEntry) return;
        setActiveGroupIndex(
          Number((closestEntry.target as HTMLElement).dataset.groupIndex),
        );
      },
      {
        root: rootElement,
        rootMargin: "-35% 0px -35% 0px",
        threshold: [0, 0.25, 0.5, 0.75, 1],
      },
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [contained, groups]);

  return (
    <section
      aria-label={`${projectTitle} vertical project media`}
      className="vertical-project-layout"
      data-contained={contained || undefined}
    >
      <div className="vertical-project-caption-stage">
        {captions.map(({ index, item }) => (
          <div
            aria-hidden={index !== activeCaptionIndex}
            className="vertical-project-caption"
            data-active={index === activeCaptionIndex || undefined}
            key={`${item.src}-caption`}
          >
            <ProjectCaption item={item} />
          </div>
        ))}
      </div>

      <div className="vertical-project-media-column" ref={mediaColumnRef}>
        {groups.map((group, groupIndex) => (
          <div
            className="vertical-project-media-group"
            data-count={group.items.length}
            data-group-index={groupIndex}
            key={group.items.map(({ item }) => item.src).join("-")}
            ref={(element) => {
              groupRefs.current[groupIndex] = element;
            }}
          >
            {group.items.map(({ index, item }) => {
              const mediaStyle: VerticalMediaStyle = {
                "--vertical-project-aspect-ratio": item.aspectRatio,
              };

              return (
                <figure
                  className="vertical-project-media-item"
                  key={`${item.src}-${index}`}
                >
                  <div
                    className="vertical-project-media-frame"
                    style={mediaStyle}
                  >
                    <VerticalProjectMedia item={item} priority={index < 2} />
                  </div>

                  {hasCaption(item) ? (
                    <figcaption className="vertical-project-mobile-caption">
                      <ProjectCaption item={item} />
                    </figcaption>
                  ) : null}
                </figure>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}
