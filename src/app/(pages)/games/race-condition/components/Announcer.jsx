import { useMemo } from "react";

import { cellCoords, CELLS, DrawReason, SIZE } from "../_lib";
import { playerFor } from "../players";
import { VisuallyHidden } from "./VisuallyHidden";

const list = (items) =>
  items.length < 2
    ? items.join("")
    : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;

// Rows are counted from the TOP, 1-based — the engine's convention, said in the
// engine's words. There is no gravity on this board and nothing to count up
// from, so "row 1" is the top row and that is all it means.
const cellName = (index) => {
  const { row, col } = cellCoords(index);

  return `row ${row + 1}, column ${col + 1}`;
};

const presses = (count) => (count === 1 ? "The board turned once." : `The board turned ${count} times.`);

/**
 * The running commentary a screen reader hears.
 *
 * A player who cannot see the board needs what a sighted player reads off it:
 * what the last turn did, and who is up. On this board that is three facts, not
 * one, because a turn is three things — whether an opponent's marble was slid,
 * where a marble was placed, and how many times the button was pressed
 * afterwards. The last of those is the one nothing else says: a turn that fills
 * the board can press up to six times, and a player who only hears "Gold placed
 * on row 2, column 3" has no idea the board they are being told about is five
 * presses further round.
 *
 * The winning line is named square by square rather than announced as "four in a
 * row", because "where" is the interesting part and it is the one thing the
 * highlight conveys that words otherwise would not. Both lines are named on a
 * simultaneous draw, in each colour's name.
 */
export const Announcer = ({ game, players }) => {
  const message = useMemo(() => {
    const upNext = playerFor(players, game.turn);

    if (!game.lastTurn) {
      return `New game. ${SIZE} by ${SIZE}, ${CELLS} squares, eight marbles each. ${upNext.name} to move.`;
    }

    const { by, move, place, spins } = game.lastTurn;
    const mover = playerFor(players, by);

    const slide =
      move === null
        ? `${mover.name} moved none of their opponent's marbles.`
        : `${mover.name} slid a marble from ${cellName(move.from)} to ${cellName(move.to)}.`;

    let sentence = `${slide} ${mover.name} placed on ${cellName(place)}. ${presses(spins)}`;

    if (game.winner !== null) {
      const winner = playerFor(players, game.winner);
      const line = (game.winningLines ?? [])
        .flatMap((cells) => cells.map(cellName));

      return `${sentence} ${winner.name} wins${
        winner.slot === by ? "" : `, on ${mover.name}'s press`
      }, with a line at ${list(line)}.`;
    }

    if (game.draw) {
      if (game.drawReason === DrawReason.Simultaneous) {
        const lines = (game.winningLines ?? []).map(
          (cells) =>
            `${playerFor(players, game.cells[cells[0]]).name} at ${list(cells.map(cellName))}`
        );

        // Joined with a semicolon, NOT `list`: each entry already ends in an
        // "and" of its own, and nesting them gives "…row 1, column 3 and row 1,
        // column 4 and Gold at…", where the last "and" sounds like a fifth
        // square rather than the second player.
        return `${sentence} Both players completed a line on the same press — ${lines.join(
          "; "
        )}. The game is a draw.`;
      }

      return `${sentence} The board is full and five more presses found no line. The game is a draw.`;
    }

    return `${sentence} ${upNext.name} to move.`;
  }, [game, players]);

  return (
    <VisuallyHidden aria-atomic="true" aria-live="polite" role="status">
      {message}
    </VisuallyHidden>
  );
};
