import { useCallback, useEffect, useRef, useState } from "react";

// Scale 1 is "the whole board fits" — there is never a reason to go below it,
// because the board is always square and always sized to its frame.
const MIN_SCALE = 1;
const MAX_SCALE = 5;

// How far a pointer may wander before a tap stops being a tap and becomes a
// pan. Below this a shaky finger still places the edge it was aimed at.
const DRAG_THRESHOLD = 8;

const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const midpoint = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

/**
 * Pinch/scroll zoom and drag pan for the board.
 *
 * The transform is applied as CSS on a wrapper element rather than baked into
 * the SVG `viewBox`, which keeps hit-testing free: the browser maps pointer
 * coordinates through the transform itself, so an edge stays exactly as
 * clickable at 5x as it is at 1x, and focus rings scale with it.
 *
 * Panning and tapping share the same pointer, so a drag has to disqualify the
 * click it would otherwise end with. That is what `DRAG_THRESHOLD` and the
 * capture-phase click guard are for — without them, every pan drops an edge on
 * the board where the finger came to rest.
 *
 * @returns {Object} A ref for the viewport, the current transform, the props to
 *   spread onto the viewport, and the zoom controls
 */
export const useZoomPan = () => {
  const viewportRef = useRef(null);
  const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 });

  // Live pointers, keyed by pointerId: one is a pan, two are a pinch.
  const pointers = useRef(new Map());
  const pinch = useRef(null);
  // Where the gesture started, so a wobble can be told from a drag.
  const origin = useRef(null);
  // Set the moment a gesture passes the threshold; read (and cleared) by the
  // click guard so the gesture cannot also place an edge.
  const dragged = useRef(false);
  const [panning, setPanning] = useState(false);

  // Translation is clamped so the board can never be flung off its own frame:
  // at scale s the content is s times the viewport, so the offset lives in
  // [size * (1 - s), 0]. At scale 1 that collapses to 0 and re-centres itself.
  const clampOffset = useCallback((x, y, scale) => {
    const frame = viewportRef.current?.getBoundingClientRect();
    const width = frame?.width ?? 0;
    const height = frame?.height ?? 0;

    return {
      x: clamp(x, width * (1 - scale), 0),
      y: clamp(y, height * (1 - scale), 0),
    };
  }, []);

  /**
   * Zoom by a factor about a focal point in viewport coordinates, so the board
   * grows away from the finger (or the cursor) rather than from the corner.
   */
  const zoomBy = useCallback(
    (factor, focus) => {
      setTransform((current) => {
        const scale = clamp(current.scale * factor, MIN_SCALE, MAX_SCALE);
        if (scale === current.scale) return current;

        const frame = viewportRef.current?.getBoundingClientRect();
        const point = focus ?? {
          x: (frame?.width ?? 0) / 2,
          y: (frame?.height ?? 0) / 2,
        };

        const ratio = scale / current.scale;
        const next = clampOffset(
          point.x - (point.x - current.x) * ratio,
          point.y - (point.y - current.y) * ratio,
          scale
        );

        return { scale, ...next };
      });
    },
    [clampOffset]
  );

  const panBy = useCallback(
    (dx, dy) => {
      setTransform((current) => ({
        ...current,
        ...clampOffset(current.x + dx, current.y + dy, current.scale),
      }));
    },
    [clampOffset]
  );

  const zoomIn = useCallback(() => zoomBy(1.5), [zoomBy]);
  const zoomOut = useCallback(() => zoomBy(1 / 1.5), [zoomBy]);
  const reset = useCallback(() => setTransform({ scale: 1, x: 0, y: 0 }), []);

  // Wheel has to be a manual, non-passive listener: React's onWheel is passive,
  // and a passive listener cannot preventDefault, so the page would scroll out
  // from under the board on every zoom.
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return undefined;

    const onWheel = (event) => {
      event.preventDefault();
      const frame = viewport.getBoundingClientRect();
      // A trackpad pinch arrives as a ctrl-wheel; both it and a plain wheel
      // mean the same thing here.
      zoomBy(Math.exp(-event.deltaY * 0.0018), {
        x: event.clientX - frame.left,
        y: event.clientY - frame.top,
      });
    };

    viewport.addEventListener("wheel", onWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", onWheel);
  }, [zoomBy]);

  // Pointer move/up are on the window, not the element: a finger that slides
  // past the frame mid-drag must keep panning, and a mouse released outside it
  // must still end the gesture.
  useEffect(() => {
    const onMove = (event) => {
      const live = pointers.current;
      if (!live.has(event.pointerId)) return;

      const previous = live.get(event.pointerId);
      const point = { x: event.clientX, y: event.clientY };
      live.set(event.pointerId, point);

      const [first, second] = [...live.values()];

      if (live.size >= 2) {
        // Pinch: the distance between the two fingers is the scale, and their
        // midpoint is the focus, so the board follows the hand.
        const frame = viewportRef.current?.getBoundingClientRect();
        const spread = distance(first, second);
        const centre = midpoint(first, second);

        if (pinch.current && pinch.current.spread > 0) {
          dragged.current = true;
          zoomBy(spread / pinch.current.spread, {
            x: centre.x - (frame?.left ?? 0),
            y: centre.y - (frame?.top ?? 0),
          });
          panBy(centre.x - pinch.current.centre.x, centre.y - pinch.current.centre.y);
        }

        pinch.current = { spread, centre };
        return;
      }

      const dx = point.x - previous.x;
      const dy = point.y - previous.y;

      if (!dragged.current) {
        const travelled = origin.current
          ? distance(point, origin.current)
          : 0;
        if (travelled < DRAG_THRESHOLD) return;
        dragged.current = true;
        setPanning(true);
      }

      panBy(dx, dy);
    };

    const onUp = (event) => {
      pointers.current.delete(event.pointerId);
      if (pointers.current.size < 2) pinch.current = null;
      if (pointers.current.size === 0) {
        origin.current = null;
        setPanning(false);
      }
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [panBy, zoomBy]);

  const onPointerDown = useCallback((event) => {
    // Only trackable pointers, and never a right-click.
    if (event.button !== undefined && event.button > 0) return;

    if (pointers.current.size === 0) {
      dragged.current = false;
      origin.current = { x: event.clientX, y: event.clientY };
    }

    pointers.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
  }, []);

  // The gesture guard. Capture phase, on the viewport, so a click born of a pan
  // dies before it ever reaches the edge it happens to be sitting over.
  const onClickCapture = useCallback((event) => {
    if (!dragged.current) return;
    dragged.current = false;
    event.preventDefault();
    event.stopPropagation();
  }, []);

  return {
    viewportRef,
    transform,
    panning,
    zoomIn,
    zoomOut,
    reset,
    canZoomIn: transform.scale < MAX_SCALE,
    canZoomOut: transform.scale > MIN_SCALE,
    viewportProps: { onClickCapture, onPointerDown, ref: viewportRef },
  };
};
