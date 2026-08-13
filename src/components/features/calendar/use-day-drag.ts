"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Dragging a task onto a calendar day.
 *
 * Built on Pointer Events rather than HTML5 drag-and-drop, and that is the
 * whole reason this file exists instead of three `draggable` attributes.
 * `dragstart` and `drop` never fire from a touch on iOS Safari — the API was
 * designed for desktop and Apple has never wired it to touch. On the phone
 * this app is actually used on, an HTML5 implementation is not "degraded", it
 * is inert. Pointer Events cover mouse, touch and pen through one code path.
 *
 * The other consequence of leaving HTML5 DnD behind is that nothing is done
 * for us: no drag image, no drop targets, no dragover. Hence the ghost
 * element, and hence hit-testing by asking the document what is under the
 * pointer.
 */

type Options = {
  /** Called on a successful drop. */
  onDrop: (dragId: string, dayKey: string) => void;
};

/** How far the pointer must travel before this counts as a drag rather than a
 * tap. Without it, the small finger movement in any real tap would start a
 * drag and the person could never simply select something. */
const THRESHOLD_PX = 6;

export function useDayDrag({ onDrop }: Options) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const [ghost, setGhost] = useState<{ x: number; y: number } | null>(null);

  // Kept in a ref rather than state: these change on every pointermove, and
  // re-rendering the whole calendar sixty times a second to track a gesture
  // that has not started yet would make the drag feel heavy.
  const pending = useRef<{ id: string; x: number; y: number } | null>(null);
  const active = useRef(false);

  const reset = useCallback(() => {
    pending.current = null;
    active.current = false;
    setDragId(null);
    setHoverKey(null);
    setGhost(null);
  }, []);

  /** Finds the calendar day under the pointer.
   *
   * elementFromPoint rather than a dragover handler, because pointer capture
   * routes every move event to the element the gesture started on — so the
   * day cells never hear about the pointer passing over them and have to be
   * discovered instead. closest() walks up from whatever child was hit (a
   * date number, a status dot) to the cell that carries the key. */
  const dayUnderPointer = useCallback((x: number, y: number): string | null => {
    const element = document.elementFromPoint(x, y);
    const cell = element?.closest<HTMLElement>("[data-day-key]");
    return cell?.dataset.dayKey ?? null;
  }, []);

  const onPointerDown = useCallback(
    (event: React.PointerEvent, id: string) => {
      // Ignore right-click and any secondary button.
      if (event.button !== 0) return;

      pending.current = { id, x: event.clientX, y: event.clientY };

      // Capture so the gesture keeps reporting to this element even once the
      // pointer has moved away from it — which it immediately does, since the
      // whole point is to drag somewhere else.
      (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    },
    [],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent) => {
      const start = pending.current;
      if (!start) return;

      if (!active.current) {
        const travelled = Math.hypot(
          event.clientX - start.x,
          event.clientY - start.y,
        );
        if (travelled < THRESHOLD_PX) return;

        active.current = true;
        setDragId(start.id);
      }

      setGhost({ x: event.clientX, y: event.clientY });
      setHoverKey(dayUnderPointer(event.clientX, event.clientY));
    },
    [dayUnderPointer],
  );

  const onPointerUp = useCallback(
    (event: React.PointerEvent) => {
      const start = pending.current;
      const wasActive = active.current;

      if (start && wasActive) {
        const target = dayUnderPointer(event.clientX, event.clientY);
        if (target) onDrop(start.id, target);
      }

      reset();
    },
    [dayUnderPointer, onDrop, reset],
  );

  // A cancelled pointer — the browser taking over for a system gesture, or the
  // finger leaving the screen edge — must clear the drag, or the ghost would
  // be left stranded on screen with no way to dismiss it.
  useEffect(() => {
    if (!dragId) return;
    window.addEventListener("pointercancel", reset);
    return () => window.removeEventListener("pointercancel", reset);
  }, [dragId, reset]);

  return {
    dragId,
    hoverKey,
    ghost,
    /** Spread onto the drag handle. The handle needs `touch-action: none` so
     * the browser does not claim the gesture for scrolling — which is why
     * this goes on a small grip rather than the whole card: dragging anywhere
     * on the card would make the list itself unscrollable on a phone. */
    handleProps: (id: string) => ({
      onPointerDown: (event: React.PointerEvent) => onPointerDown(event, id),
      onPointerMove,
      onPointerUp,
      style: { touchAction: "none" as const },
    }),
  };
}
