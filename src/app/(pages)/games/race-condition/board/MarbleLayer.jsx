import styled from "@emotion/styled";

import { cellCoords } from "../_lib";
import { playerFor } from "../players";
import { Marble } from "./Marble";

// One layer over the whole grid, inset by the panel's own padding so its
// quarters line up exactly with the sockets underneath. Nothing here is
// clickable: the cells below are the buttons, and they have to stay reachable
// through it.
const Layer = styled.div`
  inset: var(--pad);
  pointer-events: none;
  position: absolute;
`;

/**
 * Every marble on the board, keyed by identity rather than by square.
 *
 * THE KEY IS THE ANIMATION. `ids[i]` is a synthetic id that travels with the
 * marble (see `ids.js`), so the same marble in a new square is the same DOM node
 * with new coordinates — which is a `transition: transform` the browser can
 * interpolate. Key these on the index instead and every press tears down sixteen
 * nodes and builds sixteen more: nothing moves, and the board teleports one
 * position further round.
 *
 * They are rendered in ID ORDER, not board order. Ids only ever increase, so a
 * list sorted by id never reorders — a new marble is appended and the rest keep
 * their place in the DOM. React would otherwise reorder the children on every
 * press, and moving a node is a remove and a re-insert, which cancels the
 * transition it was in the middle of. Marbles never overlap (each square is
 * vacated by its own occupant in the same frame), so their paint order carries
 * no meaning to lose.
 *
 * @param {Object} props
 * @param {(String|Number|null)[]} props.cells - The board to draw
 * @param {(Number|null)[]} props.ids - One marble id per square
 * @param {Object[]} props.players - Player descriptors
 * @param {Set<Number>} [props.winningCells] - Squares in a completed line
 * @param {Number[]} [props.winningOrder] - Those squares in stagger order
 * @param {Boolean} [props.decided] - The game is over, so everything outside a
 *   winning line steps back
 */
export const MarbleLayer = ({
  cells,
  decided,
  ids,
  players,
  winningCells,
  winningOrder = [],
}) => {
  const marbles = cells
    .map((slot, index) => ({ slot, index, id: ids[index] }))
    .filter(({ id, slot }) => slot != null && id != null)
    .sort((a, b) => a.id - b.id);

  return (
    <Layer aria-hidden="true">
      {marbles.map(({ id, index, slot }) => {
        const { row, col } = cellCoords(index);
        const winning = winningCells?.has(index) ?? false;

        return (
          <Marble
            col={col}
            dimmed={decided && !winning}
            key={id}
            player={playerFor(players, slot)}
            row={row}
            winIndex={winning ? winningOrder.indexOf(index) : -1}
          />
        );
      })}
    </Layer>
  );
};
