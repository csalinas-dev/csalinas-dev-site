import { useCallback, useMemo, useRef, useState } from "react";
import { clamp } from "lodash";

import { cellCoords, cellIndex, SIZE } from "../_lib";

/**
 * Keyboard access to the board.
 *
 * Sixteen squares share ONE tab stop — a roving tabindex — rather than taking
 * sixteen of them, so a player tabbing through the page passes the board in one
 * press and steers inside it with the arrows. That is the same bargain the
 * tic-tac-overflow and edge-case boards strike.
 *
 * Enter and space act by themselves, because every cell is a real `<button>`.
 *
 * EVERY CELL IS REACHABLE, playable or not: surveying the board is not the same
 * as moving on it, and on this board — where a marble you cannot touch this turn
 * is the one you are planning around — the difference matters more than usual.
 *
 * The grid arithmetic is `cellCoords`/`cellIndex` from `_lib`, not `index / 4`
 * worked out here. It is the same convention the engine indexes with, and row 0
 * is the TOP.
 *
 * @returns {Object} The cell that owns the tab stop, a ref registrar, a focuser,
 *   and the keydown handler to hang off every cell
 */
export const useCellNavigation = () => {
  const [activeCell, setActiveCell] = useState(0);
  const elements = useRef(new Map());

  const register = useCallback(
    (index) => (element) => {
      if (element) elements.current.set(index, element);
      else elements.current.delete(index);
    },
    []
  );

  const focusCell = useCallback((index) => {
    setActiveCell(index);
    elements.current.get(index)?.focus();
  }, []);

  const onKeyDown = useCallback(
    (event, index) => {
      const { row, col } = cellCoords(index);

      // Clamped at the rim, not wrapped: a player holding an arrow down is
      // aiming at the edge of the board, and wrapping would carry them across it
      // to the far side.
      const target = {
        ArrowUp: () => cellIndex(clamp(row - 1, 0, SIZE - 1), col),
        ArrowDown: () => cellIndex(clamp(row + 1, 0, SIZE - 1), col),
        ArrowLeft: () => cellIndex(row, clamp(col - 1, 0, SIZE - 1)),
        ArrowRight: () => cellIndex(row, clamp(col + 1, 0, SIZE - 1)),
        Home: () => cellIndex(row, 0),
        End: () => cellIndex(row, SIZE - 1),
      }[event.key];

      if (!target) return;

      // Swallowed even at the rim, so the page never scrolls out from under a
      // player steering the board.
      event.preventDefault();
      focusCell(target());
    },
    [focusCell]
  );

  return useMemo(
    () => ({ activeCell, focusCell, onKeyDown, register }),
    [activeCell, focusCell, onKeyDown, register]
  );
};
