"use client";

import { useId, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent, PointerEvent } from "react";
import { aboutBiography, aboutLinks } from "@/lib/about-content";
import { AsteriskLabel } from "./AsteriskLabel";
import { ProjectDecodingCaption } from "./project/ProjectDecodingCaption";
import { ViewportMarks, viewportMarkPositions } from "./ViewportMarks";
import type { ViewportMarkPosition } from "./ViewportMarks";

type WindowBounds = Pick<DOMRectReadOnly, "left" | "top" | "width" | "height">;
type WindowAction = ViewportMarkPosition | "move";
type AxisDirection = -1 | 0 | 1 | "move";

type WindowGeometry = {
  bounds: WindowBounds;
  gutter: number;
  maxRight: number;
  maxBottom: number;
  minWidth: number;
  minHeight: number;
};

type WindowDrag = {
  action: WindowAction;
  pointerId: number;
  startX: number;
  startY: number;
  geometry: WindowGeometry;
};

const dragDirections = {
  "top-left": [-1, -1],
  "top-center": [0, -1],
  "top-right": [1, -1],
  "bottom-left": [-1, 1],
  "bottom-center": [0, 1],
  "bottom-right": [1, 1],
  move: ["move", "move"],
} satisfies Record<WindowAction, [AxisDirection, AxisDirection]>;

const arrowOffsets = new Map<string, [number, number]>([
  ["ArrowLeft", [-24, 0]],
  ["ArrowRight", [24, 0]],
  ["ArrowUp", [0, -24]],
  ["ArrowDown", [0, 24]],
]);

function getWindowGeometry(dialog: HTMLDialogElement): WindowGeometry {
  const style = getComputedStyle(dialog);
  const gutter = Number.parseFloat(style.getPropertyValue("--about-gutter"));
  const maxRight = window.innerWidth - gutter;
  const maxBottom = window.innerHeight - gutter;

  return {
    bounds: dialog.getBoundingClientRect(),
    gutter,
    maxRight,
    maxBottom,
    minWidth: Math.min(Number.parseFloat(style.getPropertyValue("--about-min-width")), maxRight - gutter),
    minHeight: Math.min(Number.parseFloat(style.getPropertyValue("--about-min-height")), maxBottom - gutter),
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max));
}

function adjustAxis(
  start: number,
  size: number,
  offset: number,
  direction: AxisDirection,
  minSize: number,
  minStart: number,
  maxEnd: number,
): [start: number, size: number] {
  if (direction === "move") return [clamp(start + offset, minStart, maxEnd - size), size];
  if (direction === 0 || offset === 0) return [start, size];
  if (direction === 1) return [start, clamp(size + offset, minSize, maxEnd - start)];

  const end = start + size;
  const nextStart = clamp(start + offset, minStart, end - minSize);
  return [nextStart, end - nextStart];
}

function isOutsideDialog(dialog: HTMLDialogElement, x: number, y: number) {
  const { left, right, top, bottom } = dialog.getBoundingClientRect();
  return x < left || x > right || y < top || y > bottom;
}

export function AboutWindow({ className, label }: { className: string; label: string }) {
  const dialogId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dragRef = useRef<WindowDrag | null>(null);
  const backdropPressRef = useRef(false);
  const [isOpen, setIsOpen] = useState(false);
  const [bounds, setBounds] = useState<WindowBounds | null>(null);

  function adjustWindow(geometry: WindowGeometry, action: WindowAction, deltaX: number, deltaY: number) {
    const { bounds: start, gutter, maxRight, maxBottom, minWidth, minHeight } = geometry;
    const [horizontal, vertical] = dragDirections[action];
    const [left, width] = adjustAxis(start.left, start.width, deltaX, horizontal, minWidth, gutter, maxRight);
    const [top, height] = adjustAxis(start.top, start.height, deltaY, vertical, minHeight, gutter, maxBottom);

    setBounds((previous) => {
      const current = previous ?? start;
      if (current.left === left && current.top === top && current.width === width && current.height === height) {
        return previous;
      }
      return { left, top, width, height };
    });
  }

  function startDrag(event: PointerEvent<HTMLButtonElement>, action: WindowAction) {
    const dialog = dialogRef.current;
    if (!dialog || !event.isPrimary || event.button !== 0) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      action,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      geometry: getWindowGeometry(dialog),
    };
  }

  function updateDrag(event: PointerEvent<HTMLDialogElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    adjustWindow(drag.geometry, drag.action, event.clientX - drag.startX, event.clientY - drag.startY);
  }

  function stopDrag(event: PointerEvent<HTMLDialogElement>) {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
  }

  function adjustWithKeyboard(event: KeyboardEvent<HTMLButtonElement>, action: WindowAction) {
    const dialog = dialogRef.current;
    const offset = arrowOffsets.get(event.key);
    if (!dialog || !offset) return;

    event.preventDefault();
    adjustWindow(getWindowGeometry(dialog), action, ...offset);
  }

  const windowStyle = bounds
    ? ({
        "--about-x": `${bounds.left}px`,
        "--about-y": `${bounds.top}px`,
        "--about-width": `${bounds.width}px`,
        "--about-height": `${bounds.height}px`,
      } as CSSProperties)
    : undefined;

  return (
    <>
      <button
        aria-controls={dialogId}
        aria-haspopup="dialog"
        className={className}
        onClick={() => {
          dialogRef.current?.showModal();
          setIsOpen(true);
          closeRef.current?.focus({ preventScroll: true });
        }}
        type="button"
      >
        <AsteriskLabel>{label}</AsteriskLabel>
      </button>

      <dialog
        aria-label={label}
        className="about-dialog pointer-events-auto"
        data-positioned={bounds ? "" : undefined}
        id={dialogId}
        onClick={(event) => {
          if (backdropPressRef.current && isOutsideDialog(event.currentTarget, event.clientX, event.clientY)) {
            event.currentTarget.close();
          }
        }}
        onClose={(event) => {
          if (!event.currentTarget.open) setIsOpen(false);
          backdropPressRef.current = false;
          dragRef.current = null;
        }}
        onPointerCancel={stopDrag}
        onPointerDown={(event) => {
          if (!event.isPrimary) return;
          backdropPressRef.current = event.target === event.currentTarget &&
            isOutsideDialog(event.currentTarget, event.clientX, event.clientY);
        }}
        onPointerMove={updateDrag}
        onPointerUp={stopDrag}
        ref={dialogRef}
        style={windowStyle}
      >
        <button
          aria-describedby={`${dialogId}-move`}
          aria-label="Move About window"
          className="about-dialog-move"
          onKeyDown={(event) => adjustWithKeyboard(event, "move")}
          onPointerDown={(event) => startDrag(event, "move")}
          type="button"
        />

        <div className="about-dialog-content">
          <div className="about-dialog-top">
            {isOpen && (
              <ProjectDecodingCaption
                className="about-dialog-bio"
                item={{ type: "caption", text: aboutBiography }}
              />
            )}
            <nav aria-label="Contact and résumé" className="about-dialog-links">
              {aboutLinks.map(({ label, href, newTab }) => (
                <a
                  className="nav-label asterisk-interaction"
                  href={href}
                  key={label}
                  rel={newTab ? "noopener" : undefined}
                  target={newTab ? "_blank" : undefined}
                >
                  <AsteriskLabel>{label}</AsteriskLabel>
                </a>
              ))}
            </nav>
          </div>
        </div>

        <form className="about-dialog-footer" method="dialog">
          <button className="nav-label asterisk-interaction" ref={closeRef} type="submit">
            <AsteriskLabel>Close</AsteriskLabel>
          </button>
        </form>

        <ViewportMarks className="about-dialog-marks" />
        {viewportMarkPositions.map((position) => (
          <button
            aria-describedby={`${dialogId}-resize`}
            aria-label={`Resize from ${position.replace("-", " ")}`}
            className="about-dialog-resize"
            data-position={position}
            key={position}
            onKeyDown={(event) => adjustWithKeyboard(event, position)}
            onPointerDown={(event) => startDrag(event, position)}
            type="button"
          />
        ))}
        <span className="sr-only" id={`${dialogId}-move`}>Use the arrow keys to move the window.</span>
        <span className="sr-only" id={`${dialogId}-resize`}>Use the arrow keys to resize.</span>
      </dialog>
    </>
  );
}
