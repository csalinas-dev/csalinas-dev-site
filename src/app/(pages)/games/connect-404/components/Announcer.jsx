import { useMemo } from "react";

import { playerFor } from "../players";
import { VisuallyHidden } from "./VisuallyHidden";

const list = (items) =>
  items.length < 2
    ? items.join("")
    : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;

// Rows are counted from the bottom everywhere a player can hear them, because
// that is the end of a column a piece actually arrives at. The column labels
// say "from the bottom" too.
const cellName = ([col, row]) => `column ${col + 1} row ${row + 1}`;

/**
 * The running commentary a screen reader hears.
 *
 * A player who cannot see the board needs the two facts a sighted player reads
 * off it instantly: what just landed, and who is up. Where a piece landed is
 * the whole of the first — a column tells you nothing on its own, because
 * gravity, not the player, chose the row.
 *
 * The winning line is named cell by cell rather than announced as "four in a
 * row", because "where" is the interesting part and it is the one thing the
 * highlight on screen conveys that words otherwise would not. It is however
 * many cells the engine found, which is occasionally five.
 */
export const Announcer = ({ game, players }) => {
  const message = useMemo(() => {
    const upNext = playerFor(players, game.turn);

    if (!game.lastMove) {
      return `New game. ${game.cols} columns, ${game.rows} rows. ${upNext.name} to move.`;
    }

    const { col, row, slot } = game.lastMove;
    const mover = playerFor(players, slot);

    let sentence = `${mover.name} dropped into column ${col + 1}, landing in row ${
      row + 1
    } from the bottom.`;

    if (game.winner !== null) {
      const line = (game.winningLine ?? []).map(cellName);
      return `${sentence} ${mover.name} wins with ${line.length} in a row: ${list(
        line
      )}.`;
    }

    if (game.draw) {
      return `${sentence} The board is full. The game is a draw.`;
    }

    return `${sentence} ${upNext.name} to move.`;
  }, [game, players]);

  return (
    <VisuallyHidden aria-atomic="true" aria-live="polite" role="status">
      {message}
    </VisuallyHidden>
  );
};
