import { useCallback, useRef } from "react";

// Tab still walks the cells in reading order; the arrow keys move focus around
// the grid the way a player expects a board to behave.
export const useBoardNavigation = () => {
  const cells = useRef([]);

  const register = useCallback(
    (index) => (element) => {
      cells.current[index] = element;
    },
    []
  );

  const onKeyDown = useCallback((event, index) => {
    const row = Math.floor(index / 3);
    const column = index % 3;

    let next = null;
    switch (event.key) {
      case "ArrowUp":
        next = row > 0 ? index - 3 : null;
        break;
      case "ArrowDown":
        next = row < 2 ? index + 3 : null;
        break;
      case "ArrowLeft":
        next = column > 0 ? index - 1 : null;
        break;
      case "ArrowRight":
        next = column < 2 ? index + 1 : null;
        break;
      default:
        return;
    }

    // Swallow the key even at the edges so the page never scrolls under the
    // board.
    event.preventDefault();
    if (next !== null) {
      cells.current[next]?.focus();
    }
  }, []);

  return { onKeyDown, register };
};
