import styled from "@emotion/styled";

import { fall, pop } from "./animations";
import { Piece } from "./Piece";

// One square of the grid: an empty socket punched out of the panel, and — if
// somebody has played here — a piece sitting in it.
//
// No margin, no gap, no border. The pitch between cells has to be exactly one
// cell height or the drop animation, which counts in cells, lands short. The
// space between the sockets comes from the sockets being smaller than the
// cells, not from anything between them.
const Container = styled.div`
  aspect-ratio: 1 / 1;
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

  /* Exactly one cell tall, which is what makes translateY(-100%) mean "one row
     up" — the piece inside it is smaller, and cannot be measured in rows. */
  .slot {
    inset: 0;
    position: absolute;
  }

  &.landing .slot {
    /* Farther is longer, the way a longer fall takes longer. The --drop
       variable is unitless so it can be multiplied by a time here and by a
       length in the keyframes. */
    animation: ${fall} calc(150ms + var(--drop) * 52ms) both;
  }

  /* Part of the four. The ring is permanent and the swell is a one-off, so the
     line stays marked long after the animation has finished — and a player who
     looks up late has still missed nothing. */
  &.winning {
    z-index: 2;

    .disc {
      filter: drop-shadow(0 0 0.4rem var(--slot));
      animation: ${pop} 620ms ease-out var(--delay) both;
    }

    circle {
      stroke: var(--foreground);
      stroke-width: 1.1;
    }
  }

  /* Everything that is not part of the winning line steps back so the line can
     step forward. Never below the point of being readable. */
  &.dimmed .disc {
    opacity: 0.4;
  }

  .disc {
    height: 100%;
    transition: opacity 400ms ease-out 500ms;
    width: 100%;
  }

  @media (prefers-reduced-motion: reduce) {
    &.landing .slot,
    &.winning .disc {
      animation: none;
    }

    .disc {
      transition: none;
    }
  }
`;

/**
 * A cell.
 *
 * Everything it is told comes from the engine. It does not know the rules, it
 * does not know whose turn it is, and — the important one — it does not decide
 * where a piece stops. `drop` is the distance from the chute to the row the
 * engine picked, in cells, and the animation only ever runs *up* from there.
 *
 * @param {Object} props
 * @param {?Object} props.player - Whoever is in this cell, or null
 * @param {Boolean} props.landing - This is the piece that has just been played
 * @param {Number} props.drop - How many cells above its cell the piece starts
 * @param {Number} props.winIndex - Its place along the winning line, or -1
 * @param {Boolean} props.dimmed - The game is won and this is not part of it
 * @param {Boolean} props.showInitials - Stamp the player's initial on the piece
 */
export const Cell = ({ dimmed, drop, landing, player, showInitials, winIndex }) => {
  const winning = winIndex >= 0;

  const className = [
    landing && "landing",
    winning && "winning",
    dimmed && "dimmed",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Container
      className={className || undefined}
      style={{
        "--drop": drop,
        // Staggered along the line, and held back long enough that the piece
        // that completed it has landed before its own cell swells.
        "--delay": winning ? `${240 + winIndex * 110}ms` : undefined,
        "--slot": player?.color,
      }}
    >
      {player && (
        <div className="slot">
          <div className="disc">
            <Piece player={player} showInitials={showInitials} />
          </div>
        </div>
      )}
    </Container>
  );
};
