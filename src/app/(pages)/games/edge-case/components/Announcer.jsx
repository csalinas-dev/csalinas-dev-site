import { useMemo } from "react";

import { boxCoords } from "../_lib";
import { playerFor } from "../players";
import { VisuallyHidden } from "./VisuallyHidden";

const list = (items) =>
  items.length < 2
    ? items.join("")
    : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;

/**
 * The running commentary a screen reader hears.
 *
 * The board is a wall of SVG: a player who cannot see it needs the two facts a
 * sighted player reads off it instantly — what just happened, and who is up.
 * Claimed boxes are named here as well as labelled on the board itself, because
 * "who owns that square" is the question the whole game turns on, and hunting
 * for it in the graphic is not an answer.
 */
export const Announcer = ({ game, players, result }) => {
  const message = useMemo(() => {
    const upNext = playerFor(players, game.turn);

    if (!game.lastMove) {
      return `New game, ${game.cols} by ${game.rows} boxes. ${upNext.name} to move.`;
    }

    const { claimed, slot, type } = game.lastMove;
    const mover = playerFor(players, slot);
    const orientation = type === "h" ? "horizontal" : "vertical";

    const boxes = claimed.map((index) => {
      const { row, col } = boxCoords(game, index);
      return `row ${row + 1} column ${col + 1}`;
    });

    let sentence = `${mover.name} drew a ${orientation} edge.`;

    if (claimed.length > 0) {
      sentence += ` ${mover.name} claimed ${claimed.length} ${
        claimed.length === 1 ? "box" : "boxes"
      }: ${list(boxes)}.`;
    }

    if (result.finished) {
      sentence += result.tie
        ? ` Game over. Tied at ${result.standings[0].score}.`
        : ` Game over. ${playerFor(players, result.winner).name} wins ${
            result.standings[0].score
          } to ${result.standings[1].score}.`;
      return sentence;
    }

    sentence +=
      claimed.length > 0
        ? ` ${mover.name} goes again.`
        : ` ${upNext.name} to move.`;

    return sentence;
  }, [game, players, result]);

  return (
    <VisuallyHidden aria-atomic="true" aria-live="polite" role="status">
      {message}
    </VisuallyHidden>
  );
};
