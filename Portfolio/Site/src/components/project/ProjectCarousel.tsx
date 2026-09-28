"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  CSSProperties,
  KeyboardEvent,
  RefObject,
  WheelEvent,
} from "react";
import type { ProjectMedia } from "@/lib/content";

type ProjectMediaStyle = CSSProperties & {
  "--project-aspect-ratio": string;
  "--project-load-delay": string;
};

type IntrinsicVideoRatio = {
  aspectRatio: string;
  orientation: "landscape" | "portrait" | "square";
};

const captionDecodeUppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const captionDecodeLowercase = "abcdefghijklmnopqrstuvwxyz";
const captionDecodeDigits = "0123456789";
const captionDecodeDuration = 720;
const captionDecodeActiveCharacters = 24;

function scrambledCharacter(character: string, index: number, tick: number) {
  const characterCode = character.charCodeAt(0);
  const alphabet = /[a-z]/.test(character)
    ? captionDecodeLowercase
    : /[A-Z]/.test(character)
      ? captionDecodeUppercase
      : /[0-9]/.test(character)
        ? captionDecodeDigits
        : null;

  if (!alphabet) return character;

  return alphabet[(characterCode + index * 7 + tick * 11) % alphabet.length];
}

function DecodingText({
  cursorVisible,
  resolvedCharacters,
  text,
  tick,
}: {
  cursorVisible: boolean;
  resolvedCharacters: number;
  text: string;
  tick: number;
}) {
  const displayedText = [...text]
    .map((character, index) => {
      if (index < resolvedCharacters) return character;

      const isWithinActiveFront =
        index - resolvedCharacters < captionDecodeActiveCharacters;

      return scrambledCharacter(
        character,
        index,
        isWithinActiveFront ? tick : 0,
      );
    })
    .join("");
  const textBeforeCursor = displayedText.slice(0, resolvedCharacters);
  const textAfterCursor = displayedText.slice(resolvedCharacters);

  return (
    <span className="caption-decode-text">
      <span aria-hidden="true" className="caption-decode-text-reserve">
        {text}
      </span>
      <span aria-hidden="true" className="caption-decode-text-visible">
        {cursorVisible ? textBeforeCursor : displayedText}
        {cursorVisible ? (
          <span className="caption-decode-cursor-anchor">
            <span
              aria-hidden="true"
              className="asterisk-marker caption-decode-cursor"
            >
              *
            </span>
          </span>
        ) : null}
        {cursorVisible ? textAfterCursor : null}
      </span>
    </span>
  );
}

function DecodingCaption({
  carouselRef,
  item,
}: {
  carouselRef: RefObject<HTMLElement | null>;
  item: ProjectMedia;
}) {
  const captionRef = useRef<HTMLElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const hasStartedRef = useRef(false);
  const label = item.captionLabel ?? "";
  const body = item.caption ?? "";
  const separatorLength = label && body ? 1 : 0;
  const totalCharacters = label.length + separatorLength + body.length;
  const [decodeState, setDecodeState] = useState({
    complete: false,
    resolvedCharacters: 0,
    tick: 0,
  });

  const startDecoding = useCallback(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    if (
      totalCharacters === 0 ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setDecodeState({
        complete: true,
        resolvedCharacters: totalCharacters,
        tick: 0,
      });
      return;
    }

    const startedAt = performance.now();

    function decodeFrame(now: number) {
      const elapsed = now - startedAt;
      const progress = Math.min(1, elapsed / captionDecodeDuration);

      setDecodeState({
        complete: progress === 1,
        resolvedCharacters: Math.min(
          totalCharacters,
          Math.floor(totalCharacters * progress),
        ),
        tick: Math.floor(elapsed / 48),
      });

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(decodeFrame);
      } else {
        animationFrameRef.current = null;
      }
    }

    animationFrameRef.current = requestAnimationFrame(decodeFrame);
  }, [totalCharacters]);

  useEffect(() => {
    const caption = captionRef.current;
    const carousel = carouselRef.current;
    if (!caption || !carousel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        startDecoding();
        observer.disconnect();
      },
      {
        root: carousel,
        rootMargin: "0px -8% 0px -8%",
        threshold: 0.25,
      },
    );

    observer.observe(caption);

    return () => {
      observer.disconnect();
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [carouselRef, startDecoding]);

  const labelResolvedCharacters = Math.min(
    label.length,
    decodeState.resolvedCharacters,
  );
  const bodyResolvedCharacters = Math.min(
    body.length,
    Math.max(
      0,
      decodeState.resolvedCharacters - label.length - separatorLength,
    ),
  );
  const cursorIsInLabel =
    Boolean(label) &&
    ((!decodeState.complete &&
      decodeState.resolvedCharacters <= label.length) ||
      (decodeState.complete && !body));
  const cursorIsInBody = Boolean(body) && !cursorIsInLabel;
  const accessibleCaption = [label, body].filter(Boolean).join(" ");

  return (
    <figcaption
      aria-label={accessibleCaption}
      className="project-media-caption"
      data-decoding={!decodeState.complete || undefined}
      ref={captionRef}
    >
      {label ? (
        <span aria-hidden="true" className="project-media-caption-label">
          <DecodingText
            cursorVisible={cursorIsInLabel}
            resolvedCharacters={labelResolvedCharacters}
            text={label}
            tick={decodeState.tick}
          />
        </span>
      ) : null}
      {body ? (
        <p aria-hidden="true" className="project-media-caption-body">
          <DecodingText
            cursorVisible={cursorIsInBody}
            resolvedCharacters={bodyResolvedCharacters}
            text={body}
            tick={decodeState.tick}
          />
        </p>
      ) : null}
    </figcaption>
  );
}

function videoOrientation(aspectRatio: number) {
  if (aspectRatio >= 0.95 && aspectRatio <= 1.05) return "square";
  return aspectRatio > 1 ? "landscape" : "portrait";
}

function ProjectVideo({
  index,
  item,
  onIntrinsicRatio,
}: {
  index: number;
  item: ProjectMedia;
  onIntrinsicRatio: (source: string, width: number, height: number) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (item.aspectRatioLabel !== "Default") return;

    const video = videoRef.current;
    if (!video) return;
    const videoElement: HTMLVideoElement = video;

    function updateIntrinsicRatio() {
      if (videoElement.videoWidth && videoElement.videoHeight) {
        onIntrinsicRatio(
          item.src,
          videoElement.videoWidth,
          videoElement.videoHeight,
        );
      }
    }

    videoElement.addEventListener("loadedmetadata", updateIntrinsicRatio);
    if (videoElement.readyState >= 1) updateIntrinsicRatio();

    return () => {
      videoElement.removeEventListener("loadedmetadata", updateIntrinsicRatio);
    };
  }, [item.aspectRatioLabel, item.src, onIntrinsicRatio]);

  return (
    <video
      aria-label={item.alt}
      autoPlay
      className="project-media-video"
      loop
      muted
      playsInline
      poster={item.poster}
      preload={index < 2 ? "auto" : "metadata"}
      ref={videoRef}
      src={item.src}
    />
  );
}

export function ProjectCarousel({
  media,
  projectTitle,
}: {
  media: ProjectMedia[];
  projectTitle: string;
}) {
  const carouselRef = useRef<HTMLElement>(null);
  const wheelAnimationRef = useRef<number | null>(null);
  const wheelTargetRef = useRef(0);
  const [intrinsicVideoRatios, setIntrinsicVideoRatios] = useState<
    Record<string, IntrinsicVideoRatio>
  >({});

  const handleVideoMetadata = useCallback(
    (source: string, width: number, height: number) => {
      const aspectRatio = `${width} / ${height}`;
      const orientation = videoOrientation(width / height);

      setIntrinsicVideoRatios((currentRatios) => {
        if (currentRatios[source]?.aspectRatio === aspectRatio) {
          return currentRatios;
        }

        return {
          ...currentRatios,
          [source]: { aspectRatio, orientation },
        };
      });
    },
    [],
  );

  const animateWheelScroll = useCallback(function animateWheelScroll() {
    const carousel = carouselRef.current;
    if (!carousel) {
      wheelAnimationRef.current = null;
      return;
    }

    const maximumScroll = Math.max(
      0,
      carousel.scrollWidth - carousel.clientWidth,
    );
    wheelTargetRef.current = Math.min(
      maximumScroll,
      Math.max(0, wheelTargetRef.current),
    );

    const remainingDistance = wheelTargetRef.current - carousel.scrollLeft;
    if (Math.abs(remainingDistance) <= 0.5) {
      carousel.scrollLeft = wheelTargetRef.current;
      wheelAnimationRef.current = null;
      return;
    }

    carousel.scrollLeft += remainingDistance * 0.22;
    wheelAnimationRef.current = requestAnimationFrame(animateWheelScroll);
  }, []);

  const cancelWheelAnimation = useCallback(() => {
    if (wheelAnimationRef.current !== null) {
      cancelAnimationFrame(wheelAnimationRef.current);
      wheelAnimationRef.current = null;
    }
  }, []);

  useEffect(() => cancelWheelAnimation, [cancelWheelAnimation]);

  function handleWheel(event: WheelEvent<HTMLElement>) {
    const carousel = event.currentTarget;
    if (carousel.scrollWidth <= carousel.clientWidth) return;

    const wheelDelta =
      Math.abs(event.deltaX) > Math.abs(event.deltaY)
        ? event.deltaX
        : event.deltaY;
    if (wheelDelta === 0) return;

    event.preventDefault();

    const deltaScale =
      event.deltaMode === 1
        ? 16
        : event.deltaMode === 2
          ? carousel.clientWidth
          : 1;
    const normalizedDelta = wheelDelta * deltaScale * 1.5;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      cancelWheelAnimation();
      carousel.scrollLeft += normalizedDelta;
      wheelTargetRef.current = carousel.scrollLeft;
      return;
    }

    const startingPosition =
      wheelAnimationRef.current === null
        ? carousel.scrollLeft
        : wheelTargetRef.current;
    const maximumScroll = Math.max(
      0,
      carousel.scrollWidth - carousel.clientWidth,
    );

    wheelTargetRef.current = Math.min(
      maximumScroll,
      Math.max(0, startingPosition + normalizedDelta),
    );

    if (wheelAnimationRef.current === null) {
      wheelAnimationRef.current = requestAnimationFrame(animateWheelScroll);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;

    event.preventDefault();
    cancelWheelAnimation();
    wheelTargetRef.current = event.currentTarget.scrollLeft;
    event.currentTarget.scrollBy({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      left:
        event.key === "ArrowLeft"
          ? -event.currentTarget.clientWidth * 0.75
          : event.currentTarget.clientWidth * 0.75,
    });
  }

  return (
    <section
      aria-label={`${projectTitle} project media`}
      className="project-carousel"
      onKeyDown={handleKeyDown}
      onWheel={handleWheel}
      ref={carouselRef}
      tabIndex={0}
    >
      <div className="project-carousel-track">
        {media.map((item, index) => {
          const hasCaption = Boolean(item.captionLabel || item.caption);
          const intrinsicVideoRatio =
            item.type === "video" && item.aspectRatioLabel === "Default"
              ? intrinsicVideoRatios[item.src]
              : undefined;
          const mediaStyle: ProjectMediaStyle = {
            "--project-aspect-ratio":
              intrinsicVideoRatio?.aspectRatio ?? item.aspectRatio,
            "--project-load-delay": `${index * 85}ms`,
          };

          return (
            <figure
              className="project-media-item"
              data-aspect-ratio={item.aspectRatioLabel}
              data-caption-position={item.captionPosition}
              data-has-caption={hasCaption || undefined}
              data-intrinsic-ready={intrinsicVideoRatio ? true : undefined}
              data-orientation={
                intrinsicVideoRatio?.orientation ?? item.orientation
              }
              key={`${item.src}-${index}`}
              style={mediaStyle}
            >
              <div className="project-media-frame">
                {item.type === "image" ? (
                  <Image
                    alt={item.alt}
                    className="object-cover"
                    fill
                    loading={index < 2 ? "eager" : "lazy"}
                    sizes="(max-width: 767px) 92vw, 800px"
                    src={item.src}
                  />
                ) : (
                  <ProjectVideo
                    index={index}
                    item={item}
                    onIntrinsicRatio={handleVideoMetadata}
                  />
                )}
              </div>

              {hasCaption ? (
                <DecodingCaption carouselRef={carouselRef} item={item} />
              ) : null}
            </figure>
          );
        })}
      </div>
    </section>
  );
}
