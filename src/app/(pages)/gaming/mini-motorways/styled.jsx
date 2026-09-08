"use client";

import styled from "@emotion/styled";

/* Summary tiles ---------------------------------------------------------- */

/* `auto-fit` with a `min(50% - 0.5rem, …)` floor: five across when there is
   room, and never fewer than two across on a phone, so five full-width tiles
   don't push the first city below the fold. */
export const Tiles = styled.div`
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(min(50% - 0.5rem, 11rem), 1fr));
  margin-bottom: 1.5rem;
`;

export const Tile = styled.div`
  background: var(--selectionBackground);
  border-radius: 1rem;
  container-type: inline-size;
  padding: 1rem;

  .label {
    color: var(--muted);
    font-size: 0.68rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .figure {
    color: var(--foreground);
    font-size: 1.9rem;
    font-variant-numeric: tabular-nums;
    line-height: 1.2;
  }

  .caption {
    color: var(--muted);
    font-size: 0.8rem;
  }

  /* A 120px tile still has to hold "6,062". */
  @container (max-width: 10rem) {
    .figure {
      font-size: 1.4rem;
    }
  }
`;

/* The city cards --------------------------------------------------------- */

/* One column, deliberately. The bars are scaled against the best score in that
   mode across every city, so they are only readable as a ranking if they also
   share an origin and a track width — which two cards side by side destroys.
   The cities are sorted best-first for the same reason. */
export const Grid = styled.div`
  display: grid;
  gap: 1rem;
  grid-template-columns: minmax(0, 1fr);
`;

/* Cards get a max width; layouts do not. `justify-self: center` stops a lone
   capped card floating left in a wider track. */
export const Card = styled.article`
  background: var(--selectionBackground);
  border-radius: 1.25rem;
  box-shadow: 0 8px 10px 1px rgba(0, 0, 0, 0.14),
    0 3px 14px 2px rgba(0, 0, 0, 0.12), 0 5px 5px -3px rgba(0, 0, 0, 0.2);
  container-type: inline-size;
  display: flex;
  flex-flow: column nowrap;
  gap: 0.75rem;
  justify-self: center;
  max-width: 44rem;
  padding: 1.25rem;
  width: 100%;
`;

export const CityName = styled.h2`
  color: var(--function);
  font-size: 1.3rem;
  font-weight: 700;
  margin: 0;
  overflow-wrap: anywhere;
`;

/* Both grids share one template so every figure on the page — modes and
   challenges, and across every card in a row — lands in the same column.
   Columns are pinned explicitly rather than left to auto-placement.

   `font-size: 0.92rem` on the container is NOT optional: `ch` resolves against
   the grid container's own font-size, and Section forces `1.5rem !important`.
   Left inherited, `8ch` becomes 118.8px instead of 72.9px, starving the bar and
   overflowing the mode grid — visible as the `best` column landing at two
   different x positions inside one card.

   `minmax(0, 1fr)` rather than `1fr` for the bar track removes that class of
   bug outright: `1fr` carries an automatic min-content floor. */
const figures = `
  align-items: center;
  column-gap: 0.6rem;
  display: grid;
  font-size: 0.92rem;
  grid-template-columns: max-content minmax(0, 1fr) 8ch;

  .label {
    grid-column: 1;
  }

  .bar {
    grid-column: 2;
  }

  .best {
    color: var(--foreground);
    font-variant-numeric: tabular-nums;
    grid-column: 3;
    text-align: right;
  }
`;

export const Modes = styled.div`
  ${figures}
  row-gap: 0.5rem;

  .caption {
    color: var(--muted);
    font-size: 0.68rem;
    letter-spacing: 0.06em;
    text-align: right;
    text-transform: uppercase;
  }
`;

export const Challenges = styled.div`
  ${figures}
  border-top: 1px solid rgba(255, 255, 255, 0.13);
  padding-top: 0.75rem;
  row-gap: 0.35rem;

  .label {
    grid-column: 1 / 3;
  }

  .unbeaten {
    color: var(--muted);
  }
`;

/* A Mini Motorways road stroke, and a data mark rather than ornament. Zero
   based, scaled against the best score in that mode across every city. */
export const BarTrack = styled.div`
  background: rgba(255, 255, 255, 0.07);
  border-radius: 999px;
  height: 9px;
  width: 100%;
`;

/* Colour is never alone — the mode's name is on every row. */
export const BarFill = styled.div`
  background: var(--string);
  border-radius: 999px;
  height: 100%;
  min-width: 9px;

  &.expert {
    background: var(--type);
  }
`;

/* `Comment` prepends its `// ` with `:first-of-type`, so the legend and the
   staleness line must not be siblings or only the first gets slashes. They also
   set their own size: Section forces `1.5rem !important` on itself and these
   inherit it, which would render an annotation at headline size. 0.92rem is the
   card grid's size, so every small figure on the page agrees. */
export const Legend = styled.p`
  font-size: 0.92rem;
  margin: 0 0 1.5rem;
`;

export const Foot = styled.p`
  font-size: 0.92rem;
  margin: 1.5rem 0 0;
`;

export const Empty = styled.p`
  font-size: 0.92rem;
  margin: 0;
  text-align: center;
`;

/* `color.js` has no muted export, and `challenge` needs one. */
export const Muted = styled.span`
  color: var(--muted);
`;
