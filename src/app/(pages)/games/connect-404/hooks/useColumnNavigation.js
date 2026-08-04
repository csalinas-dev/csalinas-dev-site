import { useCallback, useMemo, useRef, useState } from "react";
import { clamp } from "lodash";

/**
 * Keyboard access to the board.
 *
 * Seven columns share one tab stop — a roving tabindex — rather than taking
 * seven of them, so a player tabbing through the page passes the board in one
 * press and steers inside it with the arrows. Left and right choose a column;
 * enter and space drop, which they do by themselves because every column is a
 * real button.
 *
 * Down drops too. It is the direction the piece goes, a keyboard player's hand
 * is already on the arrows, and the column's own label says so.
 *
 * Every column is reachable, full or not: surveying the board is not the same
 * as moving on it, and a keyboard player has to be able to do the first.
 *
 * @param {Number} cols - How many columns there are
 * @param {Function} onActivate - `(col) => void`, for the down arrow
 * @returns {Object} The column that owns the tab stop, a ref registrar, and the
 *   keydown handler to hang off every column
 */
export const useColumnNavigation = (cols, onActivate) => {
  const [activeColumn, setActiveColumn] = useState(0);
  const elements = useRef(new Map());

  const register = useCallback(
    (col) => (element) => {
      if (element) elements.current.set(col, element);
      else elements.current.delete(col);
    },
    []
  );

  const focusColumn = useCallback((col) => {
    setActiveColumn(col);
    elements.current.get(col)?.focus();
  }, []);

  const onKeyDown = useCallback(
    (event, col) => {
      // Clamped rather than wrapped. Seven columns is few enough that a player
      // holding an arrow down is aiming at the end of the row, and wrapping
      // would carry them past it to the other side of the board.
      const target = {
        ArrowLeft: () => clamp(col - 1, 0, cols - 1),
        ArrowRight: () => clamp(col + 1, 0, cols - 1),
        Home: () => 0,
        End: () => cols - 1,
      }[event.key];

      if (target) {
        // Swallowed even at the rim, so the page never scrolls out from under
        // a player steering the board.
        event.preventDefault();
        focusColumn(target());
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        onActivate(col);
      }
    },
    [cols, focusColumn, onActivate]
  );

  return useMemo(
    () => ({ activeColumn, focusColumn, onKeyDown, register }),
    [activeColumn, focusColumn, onKeyDown, register]
  );
};
