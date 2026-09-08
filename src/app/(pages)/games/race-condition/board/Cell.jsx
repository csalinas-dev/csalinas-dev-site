import styled from "@emotion/styled";

import { beckon } from "./animations";

// One square of the grid: a socket punched out of the panel, and the rings that
// say what tapping it would do. It holds NO marble — the layer above the grid
// does, because a marble has to be able to travel between squares and a marble
// parented to one cannot.
//
// No margin, no gap, no border. The pitch between squares has to be exactly one
// square or the orbit, which travels in whole squares, lands short. The space
// between the sockets comes from the sockets being smaller than the squares.
const Container = styled.button`
  aspect-ratio: 1 / 1;
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

  /* The hole. */
  &::before {
    background-color: var(--background);
    border-radius: 50%;
    box-shadow: inset 0 0.08rem 0.22rem rgba(0, 0, 0, 0.55);
    content: "";
    inset: 7%;
    position: absolute;
  }

  /* The rings live on their own element so the socket keeps its inset shadow:
     the pulse animates box-shadow, and one element cannot hold both. */
  .ring {
    border-radius: 50%;
    inset: 7%;
    pointer-events: none;
    position: absolute;
  }

  &.offering {
    cursor: pointer;

    .ring {
      animation: ${beckon} 1900ms ease-in-out infinite;
    }
  }

  /* An opponent marble with somewhere to go. */
  &.source .ring {
    --beckon: rgba(204, 204, 204, 0.22);
    outline: 1px dashed var(--absentForeground);
    outline-offset: -1px;
  }

  /* The one you have picked up. Solid, and not pulsing — it is not an offer any
     more, it is a decision. */
  &.selected .ring {
    animation: none;
    outline: 2px solid var(--var);
    outline-offset: -1px;
  }

  /* Where it could go. Louder than a placement ring on purpose: every empty
     square is a placement, and only two or three of them are this. */
  &.destination .ring {
    --beckon: rgba(156, 220, 254, 0.35);
    background-color: rgba(156, 220, 254, 0.14);
    outline: 2px solid var(--var);
    outline-offset: -1px;
  }

  /* Where your own marble could land. Quieter than a destination: on most turns
     this is a dozen squares at once, and a dozen loud rings is noise. */
  &.placeable .ring {
    --beckon: rgba(204, 204, 204, 0.12);
    outline: 1px solid var(--absentForeground);
    outline-offset: -1px;
  }

  /* The square a staged slide has emptied. It is placeable like any other empty
     square, and it gets its own mark because "you may place where the marble you
     just moved was standing" is the rule players miss. */
  &.vacated .ring {
    --beckon: rgba(156, 220, 254, 0.22);
    background-color: rgba(156, 220, 254, 0.07);
    outline: 1px dashed var(--var);
    outline-offset: -1px;
  }

  /* Part of a completed line. Permanent, so a player who looks up late has
     missed nothing; the swell that draws the eye to it is on the marble. */
  &.winning .ring {
    animation: none;
    outline: 2px solid var(--foreground);
    outline-offset: -1px;
  }

  &:focus-visible {
    outline: 2px solid var(--var);
    outline-offset: -2px;
  }

  @media (prefers-reduced-motion: reduce) {
    &.offering .ring {
      animation: none;
    }
  }
`;

/**
 * One square of the board, and the control that acts on it.
 *
 * It knows no rules. Which squares are offering what is decided by
 * `useTurnDraft` out of `legalMoves`/`emptyCells`, and this is handed the
 * answer; it does not know whose turn it is, whether a marble may move, or what
 * "adjacent" means.
 *
 * `aria-disabled` rather than `disabled`, always: an inert square must stay
 * reachable, because surveying the board is not the same as playing on it.
 *
 * @param {Object} props
 * @param {Number} props.index - 0…15, row-major, row 0 on TOP
 * @param {Number} props.row - Its row, from `cellCoords`
 * @param {Number} props.col - Its column, from `cellCoords`
 * @param {String} props.label - The whole accessible label, built by the board
 * @param {Boolean} props.source - An opponent marble this device may slide
 * @param {Boolean} props.selected - The slide's source, picked up
 * @param {Boolean} props.destination - Somewhere the picked-up marble may go
 * @param {Boolean} props.placeable - Somewhere this device may place a marble
 * @param {Boolean} props.vacated - Emptied by the staged slide
 * @param {Boolean} props.winning - Part of a completed line
 * @param {Function} props.onActivate - `(index) => void`
 * @param {Function} props.onKeyDown - `(event, index) => void`
 * @param {Function} props.register - Ref callback for the roving tab stop
 * @param {Number} props.tabIndex - 0 for the one square that owns the tab stop
 */
export const Cell = ({
  col,
  destination,
  index,
  label,
  onActivate,
  onKeyDown,
  placeable,
  register,
  row,
  selected,
  source,
  tabIndex,
  vacated,
  winning,
}) => {
  const offering = source || destination || placeable;

  const className = [
    offering && "offering",
    source && "source",
    selected && "selected",
    destination && "destination",
    placeable && !vacated && "placeable",
    vacated && "vacated",
    winning && "winning",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Container
      aria-disabled={!offering && !selected}
      aria-label={label}
      className={className || undefined}
      data-cell={index}
      data-col={col}
      data-row={row}
      onClick={() => onActivate(index)}
      onKeyDown={(event) => onKeyDown(event, index)}
      ref={register}
      tabIndex={tabIndex}
      type="button"
    >
      <span className="ring" />
    </Container>
  );
};
