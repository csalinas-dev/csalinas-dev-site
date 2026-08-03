import { useCallback, useMemo, useRef, useState } from "react";

import { edgeKey, Orientation } from "../_lib";
import { neighborEdge } from "../board/geometry";

/**
 * Keyboard access to the board.
 *
 * A 9-dot board has 144 edges. Putting all of them in the tab order would bury
 * the rest of the page, so they share a single tab stop — a roving tabindex —
 * and the arrow keys walk between them once focus is inside. That is the same
 * bargain the tic-tac-overflow board strikes, scaled up.
 *
 * Every edge is reachable, drawn or not: a keyboard-only player has to be able
 * to survey the board, not just the moves still open to them.
 *
 * @param {Object} grid - Anything with `cols` and `rows` (a game state will do)
 * @returns {Object} The key that currently owns the tab stop, a ref registrar,
 *   and the keydown handler to hang off every edge
 */
export const useEdgeNavigation = (grid) => {
  // The top-left horizontal edge always exists on any legal board, so it is a
  // safe place for the tab stop to start.
  const [activeKey, setActiveKey] = useState(() =>
    edgeKey(Orientation.Horizontal, 0)
  );

  const elements = useRef(new Map());

  const register = useCallback(
    (key) => (element) => {
      if (element) elements.current.set(key, element);
      else elements.current.delete(key);
    },
    []
  );

  const focusEdge = useCallback((orientation, index) => {
    const key = edgeKey(orientation, index);
    setActiveKey(key);
    elements.current.get(key)?.focus();
  }, []);

  const onKeyDown = useCallback(
    (event, orientation, index) => {
      if (!event.key.startsWith("Arrow")) return;

      // Swallow arrows even at the rim, so the page never scrolls out from
      // under a player steering the board.
      event.preventDefault();

      const next = neighborEdge(grid, orientation, index, event.key);
      if (next) focusEdge(next.orientation, next.index);
    },
    [focusEdge, grid]
  );

  return useMemo(
    () => ({ activeKey, focusEdge, onKeyDown, register }),
    [activeKey, focusEdge, onKeyDown, register]
  );
};
