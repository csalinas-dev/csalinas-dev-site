import { range } from "lodash";
import styled from "@emotion/styled";

import { cellAt } from "../_lib";
import { playerFor } from "../players";
import { refuse } from "./animations";
import { Cell } from "./Cell";

// A whole column is one control. That is how the game is played — you choose a
// column, not a square — and it also happens to give a phone a tap target six
// cells tall, which no individual cell would.
const Container = styled.button`
  background-color: transparent;
  border: none;
  border-radius: 0.5rem;
  color: inherit;
  cursor: default;
  display: block;
  font: inherit;
  padding: 0;
  position: relative;
  width: 100%;

  &.open {
    cursor: pointer;
  }

  &.full {
    cursor: not-allowed;
  }

  /* The column under the cursor or the keyboard. Faint, because it is behind
     six sockets and the piece hovering over it says the same thing louder. */
  &.active::after {
    background-color: var(--selectionBackground);
    border-radius: 0.4rem;
    content: "";
    inset: 0;
    pointer-events: none;
    position: absolute;
  }

  &:focus-visible {
    outline: 2px solid var(--var);
    outline-offset: 2px;
  }
`;

// The thing that actually shakes when a full column is asked for another piece.
// Separate from the button so the refusal never moves the focus ring, and so it
// can be remounted to replay — which the button, holding focus, must not be.
const Stack = styled.div`
  display: flex;
  flex-flow: column nowrap;
  width: 100%;

  &.refused {
    animation: ${refuse} 380ms ease-in-out;
  }

  @media (prefers-reduced-motion: reduce) {
    &.refused {
      animation: none;
    }
  }
`;

/**
 * What is in a column, bottom first.
 *
 * Bottom first because that is the order the pieces arrived in and the order
 * the labels count rows in — a column read top-down would be describing a
 * board nobody is playing on.
 *
 * @returns {String} "empty", or "3 of 6 filled, from the bottom: Red, Blue, Red"
 */
const describeContents = (game, players, col) => {
  const height = game.columns[col].length;
  if (height === 0) return "empty";

  const names = range(height).map(
    (row) => playerFor(players, cellAt(game, col, row)).name
  );

  // A full column says so first and counts afterwards. "6 of 6 filled" is the
  // same fact arrived at by arithmetic, and it should not be the first thing a
  // player has to do to find out they cannot play there.
  const state =
    height >= game.rows ? "full" : `${height} of ${game.rows} filled`;

  return `${state}, from the bottom: ${names.join(", ")}`;
};

/**
 * One column of the board, and the control that drops a piece into it.
 *
 * @param {Object} props
 * @param {Number} props.col - 0-based column
 * @param {Object} props.game - An engine state
 * @param {Object[]} props.players - Player descriptors
 * @param {Boolean} props.active - The cursor or the keyboard is on this column
 * @param {Boolean} props.interactive - This device may drop a piece right now
 * @param {?Number} props.landingRow - Where a piece would land, null if full
 * @param {?Object} props.you - Whose piece would be dropped, if anyone's
 * @param {?Number} props.refusedNonce - Set, and different each time, while this
 *   column is refusing a drop
 * @param {Function} props.onActivate - `(col) => void`
 * @param {Function} props.onHover - `(col | null) => void`
 * @param {Function} props.onFocus - `(col) => void`
 * @param {Function} props.onBlur - `() => void`
 * @param {Function} props.onKeyDown - `(event, col) => void`
 * @param {Function} props.register - Ref callback for the roving tab stop
 * @param {Number} props.tabIndex - 0 for the one column that owns the tab stop
 */
export const Column = ({
  active,
  col,
  game,
  interactive,
  landingRow,
  onActivate,
  onBlur,
  onFocus,
  onHover,
  onKeyDown,
  players,
  refusedNonce,
  register,
  tabIndex,
  you,
}) => {
  const full = landingRow === null;
  const open = interactive && !full;

  // What the column is, then what pressing it would do. The second half is
  // absent for a spectator and for the player who is not on the clock, because
  // for them pressing it does nothing.
  let label = `Column ${col + 1}, ${describeContents(game, players, col)}`;
  if (open && you) {
    label += `. Drop ${you.name} here, landing in row ${landingRow + 1} from the bottom`;
  }

  const className = [open && "open", interactive && full && "full", active && "active"]
    .filter(Boolean)
    .join(" ");

  return (
    <Container
      aria-disabled={!open}
      aria-label={label}
      className={className || undefined}
      onBlur={onBlur}
      onClick={() => onActivate(col)}
      onFocus={() => onFocus(col)}
      onKeyDown={(event) => onKeyDown(event, col)}
      onPointerEnter={() => onHover(col)}
      onPointerLeave={() => onHover(null)}
      ref={register}
      tabIndex={tabIndex}
      type="button"
    >
      {/* Remounted on every refusal so the shake replays on the second attempt
          as well as the first. Keyed on "idle" the rest of the time, so nothing
          else in the column is ever torn down. */}
      <Stack
        className={refusedNonce ? "refused" : undefined}
        key={refusedNonce ?? "idle"}
      >
        {/* Top-down, because that is the order the rows appear on screen —
            and the engine counts from the bottom, so this is the one place the
            two conventions have to meet. Row 0 is the LAST cell rendered. */}
        {range(game.rows - 1, -1, -1).map((row) => {
          const slot = cellAt(game, col, row);
          // Every cell the engine names, however many that is. Filling the gap
          // in ● ● _ ● ● makes a genuine run of five and the engine returns all
          // of it; slicing to four would leave a piece of the winning line
          // looking like it lost.
          const winIndex =
            game.winningLine?.findIndex(
              ([wc, wr]) => wc === col && wr === row
            ) ?? -1;

          return (
            <Cell
              dimmed={game.winner !== null && winIndex < 0}
              /* From the chute, one cell above the top row, down to here. */
              drop={game.rows - row}
              key={row}
              landing={
                game.lastMove?.col === col && game.lastMove?.row === row
              }
              player={slot === null ? null : playerFor(players, slot)}
              winIndex={winIndex}
            />
          );
        })}
      </Stack>
    </Container>
  );
};
