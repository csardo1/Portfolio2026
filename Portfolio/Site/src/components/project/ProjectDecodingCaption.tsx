"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import type { ProjectMedia } from "@/lib/content";

const captionDecodeUppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const captionDecodeLowercase = "abcdefghijklmnopqrstuvwxyz";
const captionDecodeDigits = "0123456789";
const captionDecodeDuration = 720;
const captionDecodeActiveCharacters = 24;
const captionRewriteInitialHold = 520;

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
  sourceText,
  text,
  tick,
}: {
  cursorVisible: boolean;
  resolvedCharacters: number;
  sourceText?: string;
  text: string;
  tick: number;
}) {
  const displayedLength = Math.max(text.length, sourceText?.length ?? 0);
  const displayedText = Array.from({ length: displayedLength }, (_, index) => {
    const targetCharacter = text[index] ?? " ";
    if (index < resolvedCharacters) return targetCharacter;

    const sourceCharacter = sourceText?.[index] ?? targetCharacter;
    const isWithinActiveFront =
      index - resolvedCharacters < captionDecodeActiveCharacters;

    if (sourceText !== undefined && !isWithinActiveFront) {
      return sourceCharacter;
    }

    return scrambledCharacter(
      sourceCharacter,
      index,
      isWithinActiveFront ? tick : 0,
    );
  }).join("");
  const cursorIndex =
    resolvedCharacters >= displayedLength
      ? text.length
      : Math.min(resolvedCharacters, displayedLength);
  const textBeforeCursor = displayedText.slice(0, cursorIndex);
  const textAfterCursor = displayedText.slice(cursorIndex);

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

export function ProjectDecodingCaption({
  className = "project-media-caption",
  item,
  rootRef,
  semantic = true,
}: {
  className?: string;
  item: ProjectMedia;
  rootRef?: RefObject<HTMLElement | null>;
  semantic?: boolean;
}) {
  const captionRef = useRef<HTMLElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const animationDelayTimeoutRef = useRef<number | null>(null);
  const completionTimeoutRef = useRef<number | null>(null);
  const previousCaptionRef = useRef({
    body: item.caption ?? "",
    label: item.captionLabel ?? "",
  });
  const label = item.captionLabel ?? "";
  const body = item.caption ?? "";
  const initialSeparatorLength = label && body ? 1 : 0;
  const [decodeState, setDecodeState] = useState({
    complete: false,
    resolvedCharacters: 0,
    tick: 0,
  });
  const [sourceCaption, setSourceCaption] = useState<{
    body: string;
    label: string;
  } | null>(null);
  const [transitionShape, setTransitionShape] = useState({
    bodyCharacters: body.length,
    labelCharacters: label.length,
    separatorCharacters: initialSeparatorLength,
  });

  const startDecoding = useCallback((characterCount: number, delay = 0) => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (animationDelayTimeoutRef.current !== null) {
      window.clearTimeout(animationDelayTimeoutRef.current);
      animationDelayTimeoutRef.current = null;
    }
    if (completionTimeoutRef.current !== null) {
      window.clearTimeout(completionTimeoutRef.current);
      completionTimeoutRef.current = null;
    }

    if (
      characterCount === 0 ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setDecodeState({
        complete: true,
        resolvedCharacters: characterCount,
        tick: 0,
      });
      return;
    }

    setDecodeState({
      complete: false,
      resolvedCharacters: 0,
      tick: 0,
    });

    function completeDecoding() {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (completionTimeoutRef.current !== null) {
        window.clearTimeout(completionTimeoutRef.current);
        completionTimeoutRef.current = null;
      }
      setDecodeState({
        complete: true,
        resolvedCharacters: characterCount,
        tick: 0,
      });
    }

    function beginDecoding() {
      animationDelayTimeoutRef.current = null;
      const startedAt = performance.now();

      function decodeFrame(now: number) {
        const elapsed = now - startedAt;
        const progress = Math.min(1, elapsed / captionDecodeDuration);

        setDecodeState({
          complete: progress === 1,
          resolvedCharacters: Math.min(
            characterCount,
            Math.floor(characterCount * progress),
          ),
          tick: Math.floor(elapsed / 48),
        });

        if (progress < 1) {
          animationFrameRef.current = requestAnimationFrame(decodeFrame);
        } else {
          animationFrameRef.current = null;
          if (completionTimeoutRef.current !== null) {
            window.clearTimeout(completionTimeoutRef.current);
            completionTimeoutRef.current = null;
          }
        }
      }

      animationFrameRef.current = requestAnimationFrame(decodeFrame);
      completionTimeoutRef.current = window.setTimeout(
        completeDecoding,
        captionDecodeDuration + 180,
      );
    }

    if (delay > 0) {
      animationDelayTimeoutRef.current = window.setTimeout(
        beginDecoding,
        delay,
      );
    } else {
      beginDecoding();
    }
  }, []);

  useEffect(() => {
    const caption = captionRef.current;
    if (!caption) return;

    const previousCaption = previousCaptionRef.current;
    const isInitialCaption =
      previousCaption.label === label && previousCaption.body === body;
    const transitionSource = isInitialCaption ? null : previousCaption;
    const labelCharacters = Math.max(
      label.length,
      transitionSource?.label.length ?? 0,
    );
    const bodyCharacters = Math.max(
      body.length,
      transitionSource?.body.length ?? 0,
    );
    const separatorCharacters = labelCharacters && bodyCharacters ? 1 : 0;
    const transitionCharacters =
      labelCharacters + separatorCharacters + bodyCharacters;

    setSourceCaption(transitionSource);
    setTransitionShape({
      bodyCharacters,
      labelCharacters,
      separatorCharacters,
    });
    previousCaptionRef.current = { body, label };

    if (!rootRef) {
      startDecoding(
        transitionCharacters,
        isInitialCaption ? captionRewriteInitialHold : 0,
      );
      return () => {
        if (animationFrameRef.current !== null) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
        if (animationDelayTimeoutRef.current !== null) {
          window.clearTimeout(animationDelayTimeoutRef.current);
          animationDelayTimeoutRef.current = null;
        }
        if (completionTimeoutRef.current !== null) {
          window.clearTimeout(completionTimeoutRef.current);
          completionTimeoutRef.current = null;
        }
      };
    }

    const root = rootRef.current;
    if (!root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        startDecoding(transitionCharacters);
        observer.disconnect();
      },
      {
        root,
        rootMargin: "0px -8% 0px -8%",
        threshold: 0.25,
      },
    );

    observer.observe(caption);

    return () => {
      observer.disconnect();
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (animationDelayTimeoutRef.current !== null) {
        window.clearTimeout(animationDelayTimeoutRef.current);
        animationDelayTimeoutRef.current = null;
      }
      if (completionTimeoutRef.current !== null) {
        window.clearTimeout(completionTimeoutRef.current);
        completionTimeoutRef.current = null;
      }
    };
  }, [body, label, rootRef, startDecoding]);

  const labelResolvedCharacters = Math.min(
    transitionShape.labelCharacters,
    decodeState.resolvedCharacters,
  );
  const bodyResolvedCharacters = Math.min(
    transitionShape.bodyCharacters,
    Math.max(
      0,
      decodeState.resolvedCharacters -
        transitionShape.labelCharacters -
        transitionShape.separatorCharacters,
    ),
  );
  const cursorIsInLabel =
    Boolean(label) &&
    ((!decodeState.complete &&
      decodeState.resolvedCharacters <= transitionShape.labelCharacters) ||
      (decodeState.complete && !body));
  const cursorIsInBody = Boolean(body) && !cursorIsInLabel;
  const accessibleCaption = [label, body].filter(Boolean).join(" ");
  const captionContent = (
    <>
      {label ? (
        <span aria-hidden="true" className="project-media-caption-label">
          <DecodingText
            cursorVisible={cursorIsInLabel}
            resolvedCharacters={labelResolvedCharacters}
            sourceText={sourceCaption?.label}
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
            sourceText={sourceCaption?.body}
            text={body}
            tick={decodeState.tick}
          />
        </p>
      ) : null}
    </>
  );

  if (!semantic) {
    return (
      <div
        aria-hidden="true"
        className={className}
        data-decoding={!decodeState.complete || undefined}
        ref={captionRef as RefObject<HTMLDivElement | null>}
      >
        {captionContent}
      </div>
    );
  }

  return (
    <figcaption
      aria-label={accessibleCaption}
      className={className}
      data-decoding={!decodeState.complete || undefined}
      ref={captionRef}
    >
      {captionContent}
    </figcaption>
  );
}
