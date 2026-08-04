"use client";

import Image from "next/image";
import Link from "next/link";
import styled from "@emotion/styled";

import { Module, Section, Title } from "@/components";

import wordleverse from "@/assets/wordleverse.jpg";
import hashtag from "@/assets/hashtag.jpg";

// Mini Motorways is hidden for now — the page itself still lives at
// /games/mini-motorways, it just isn't linked from here or the nav.

const Container = styled.div`
  display: grid;
  gap: 1rem;
  grid-template-areas:
    "wordle hashtag"
    "tictacoverflow tictacoverflow"
    "edgecase edgecase"
    "connect404 connect404";
  grid-template-columns: 1fr 1fr;
  grid-template-rows: auto;

  .wordle {
    aspect-ratio: 1 / 2;
    grid-area: wordle;
  }

  .hashtag {
    aspect-ratio: 1 / 2;
    grid-area: hashtag;
  }

  .tictacoverflow {
    aspect-ratio: 2 / 1;
    grid-area: tictacoverflow;
  }

  .edgecase {
    aspect-ratio: 2 / 1;
    grid-area: edgecase;
  }

  .connect404 {
    aspect-ratio: 2 / 1;
    grid-area: connect404;
  }

  @media (min-width: 896px) {
    gap: 3rem;
  }

  /* One row, and from here on every card is the same tall portrait. The old
     layout gave Edge Case a double-width column, which only looked square
     because the row was as tall as the 1:2 cards beside it; a fifth game makes
     five equal columns both simpler and narrower than that column ever was. */
  @media (min-width: 1296px) {
    grid-template-areas: "wordle hashtag tictacoverflow edgecase connect404";
    grid-template-columns: repeat(5, 1fr);

    .tictacoverflow,
    .edgecase,
    .connect404 {
      aspect-ratio: 1 / 2;
    }
  }
`;

const Card = styled(Link)`
  border-radius: 1rem;
  box-shadow: 0 8px 10px 1px rgba(0, 0, 0, 0.14),
    0 3px 14px 2px rgba(0, 0, 0, 0.12), 0 5px 5px -3px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  position: relative;
  width: 100%;

  &:hover img,
  &:hover .artwork {
    transform: scale(1.05);
  }
`;

const CardImage = styled(Image)`
  object-fit: cover;
  transform: scale(1);
  transition: transform ease-in-out 250ms;
  object-position: top;
`;

// Stand-in artwork for games with no screenshot yet — a stylised board drawn
// in the site palette so the card still reads as a game tile.
const CardArtwork = styled.div`
  /* Sits high and to the right so the card title keeps the bottom-left
     corner to itself, whichever way round the card is. */
  align-items: flex-start;
  background: radial-gradient(circle at 60% 25%, #2b2b2b, #151515 75%);
  display: flex;
  height: 100%;
  justify-content: flex-end;
  padding: 8%;
  transform: scale(1);
  transition: transform ease-in-out 250ms;
  width: 100%;

  /* The card is wide here and tall past 1296px, so the square board is sized
     off whichever edge is the short one. */
  svg {
    aspect-ratio: 1 / 1;
    height: 100%;
    width: auto;

    @media (min-width: 1296px) {
      height: auto;
      width: 100%;
    }
  }
`;

const CardTitle = styled.div`
  align-items: flex-end;
  background: linear-gradient(to top, #181818, transparent);
  bottom: 0;
  color: var(--function);
  display: flex;
  font-size: 1rem;
  justify-content: flex-start;
  left: 0;
  padding: 2rem 1rem;
  position: absolute;
  right: 0;
  top: 0;
  user-select: none;

  @media (min-width: 500px) {
    font-size: 1.5rem;
  }

  @media (min-width: 696px) {
    font-size: 2rem;
  }

  @media (min-width: 896px) {
    font-size: 2.75rem;
  }

  @media (min-width: 1296px) {
    font-size: 2rem;
  }

  @media (min-width: 1596px) {
    font-size: 2.75rem;
  }
`;

// Cell origins for a 3x3 board of 90px cells separated by 15px gutters.
const OFFSETS = [0, 105, 210];
const cell = (index) => ({
  x: OFFSETS[index % 3],
  y: OFFSETS[Math.floor(index / 3)],
});

const TicTacOverflowArtwork = () => (
  <svg viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg">
    {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((index) => {
      const { x, y } = cell(index);
      return (
        <rect
          fill="rgba(173, 214, 255, 0.15)"
          height="90"
          key={index}
          rx="9"
          width="90"
          x={x}
          y={y}
        />
      );
    })}
    <g fill="none" strokeLinecap="round" strokeWidth="11">
      {/* X's oldest mark, on its way out. */}
      <g opacity="0.35" stroke="#4fc1ff">
        <line x1="20" y1="20" x2="70" y2="70" />
        <line x1="70" y1="20" x2="20" y2="70" />
      </g>
      <g stroke="#4fc1ff">
        <line x1="230" y1="20" x2="280" y2="70" />
        <line x1="280" y1="20" x2="230" y2="70" />
        <line x1="125" y1="125" x2="175" y2="175" />
        <line x1="175" y1="125" x2="125" y2="175" />
      </g>
      <g stroke="#ce9178">
        <circle cx="150" cy="45" r="26" />
        <circle cx="255" cy="150" r="26" />
        <circle cx="45" cy="255" r="26" />
      </g>
    </g>
    <rect
      fill="none"
      height="90"
      rx="9"
      stroke="rgba(204, 204, 204, 0.54)"
      strokeDasharray="10 8"
      strokeWidth="3"
      width="90"
      x="0"
      y="0"
    />
  </svg>
);

// A 4x4 dot lattice — three boxes to a side. Four boxes claimed, one per
// player colour, each stamped with the initial the real board uses so the tile
// reads the same way the game does.
const DOTS = [25, 108, 192, 275];
const CLAIMED = [
  { row: 0, col: 0, color: "#4fc1ff", initial: "B" },
  { row: 0, col: 2, color: "#c586c0", initial: "P" },
  { row: 1, col: 1, color: "#4ec9b0", initial: "G" },
  { row: 2, col: 1, color: "#d7ac57", initial: "O" },
];

const EdgeCaseArtwork = () => {
  // Every edge of a claimed box is necessarily drawn — that is what claimed it.
  const drawn = new Set();
  CLAIMED.forEach(({ row, col }) => {
    drawn.add(`h-${row}-${col}`);
    drawn.add(`h-${row + 1}-${col}`);
    drawn.add(`v-${row}-${col}`);
    drawn.add(`v-${row}-${col + 1}`);
  });

  const edges = [];
  for (let row = 0; row < 4; row += 1) {
    for (let col = 0; col < 4; col += 1) {
      if (col < 3) edges.push({ key: `h-${row}-${col}`, x1: DOTS[col], y1: DOTS[row], x2: DOTS[col + 1], y2: DOTS[row] });
      if (row < 3) edges.push({ key: `v-${row}-${col}`, x1: DOTS[col], y1: DOTS[row], x2: DOTS[col], y2: DOTS[row + 1] });
    }
  }

  return (
    <svg viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg">
      {CLAIMED.map(({ row, col, color, initial }) => (
        <g key={`${row}-${col}`}>
          <rect
            fill={color}
            height={DOTS[row + 1] - DOTS[row]}
            opacity="0.22"
            rx="6"
            width={DOTS[col + 1] - DOTS[col]}
            x={DOTS[col]}
            y={DOTS[row]}
          />
          <text
            dominantBaseline="central"
            fill={color}
            fontSize="30"
            fontWeight="700"
            textAnchor="middle"
            x={(DOTS[col] + DOTS[col + 1]) / 2}
            y={(DOTS[row] + DOTS[row + 1]) / 2}
          >
            {initial}
          </text>
        </g>
      ))}
      {/* Drawn edges are neutral, matching the board: the rules record who
          closed a box, not who drew an edge. */}
      {edges.map(({ key, ...line }) => (
        <line
          {...line}
          key={key}
          stroke={drawn.has(key) ? "#cccccc" : "rgba(204, 204, 204, 0.16)"}
          strokeLinecap="round"
          strokeWidth={drawn.has(key) ? 8 : 5}
        />
      ))}
      {DOTS.map((y) =>
        DOTS.map((x) => (
          <circle cx={x} cy={y} fill="#999999" key={`${x}-${y}`} r="6" />
        ))
      )}
    </svg>
  );
};

// Seven columns, six rows, and the columns are written bottom-up — the same way
// round they are in the engine, where `columns[c][0]` is the disc resting on the
// floor. Red has just taken the bottom row; a ghost hangs over column six to say
// that a turn here is a column, not a square.
const C404_CELL = 42;
const C404_ORIGIN = { x: 3, y: 48 };
const C404_COLUMNS = [
  ["blue"],
  ["red", "blue"],
  ["red", "blue", "red"],
  ["red", "blue"],
  ["red"],
  [],
  [],
];
const C404_WIN = [1, 2, 3, 4];
const C404_FILL = { red: "#f44747", blue: "#4fc1ff" };

const c404x = (col) => C404_ORIGIN.x + C404_CELL * (col + 0.5);
// Height 0 is the floor, so it is the *last* of the six rows on screen.
const c404y = (height) => C404_ORIGIN.y + C404_CELL * (5 - height + 0.5);

const Connect404Artwork = () => {
  const discs = C404_COLUMNS.flatMap((column, col) =>
    column.map((color, height) => ({
      color,
      cx: c404x(col),
      cy: c404y(height),
      key: `${col}-${height}`,
    })),
  );

  return (
    <svg viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg">
      {/* The plate is a solid sheet with forty-two holes punched through it, so
          the discs below show through exactly as they do in the real thing. */}
      <mask id="connect404-holes">
        <rect fill="#ffffff" height="252" rx="10" width="294" x="3" y="48" />
        {C404_COLUMNS.map((_, col) =>
          [0, 1, 2, 3, 4, 5].map((height) => (
            <circle
              cx={c404x(col)}
              cy={c404y(height)}
              fill="#000000"
              key={`${col}-${height}`}
              r="16"
            />
          )),
        )}
      </mask>

      {/* Nobody's turn yet — the disc waiting above the column it would fall
          down. Drawn first so the plate crops nothing of it. */}
      <circle cx={c404x(5)} cy="24" fill={C404_FILL.red} opacity="0.35" r="15" />

      {discs.map(({ color, cx, cy, key }) => (
        <circle cx={cx} cy={cy} fill={C404_FILL[color]} key={key} r="15" />
      ))}

      <rect
        fill="rgba(173, 214, 255, 0.15)"
        height="252"
        mask="url(#connect404-holes)"
        rx="10"
        width="294"
        x="3"
        y="48"
      />

      <line
        stroke="#ffd700"
        strokeLinecap="round"
        strokeWidth="7"
        x1={c404x(C404_WIN[0])}
        x2={c404x(C404_WIN[C404_WIN.length - 1])}
        y1={c404y(0)}
        y2={c404y(0)}
      />
    </svg>
  );
};

export default function Page() {
  return (
    <Section>
      <Title>Games</Title>
      <Container>
        <Card className="wordle" href="/games/wordleverse">
          <CardImage
            alt="Wordleverse Screenshot"
            fill
            placeholder="blur"
            src={wordleverse}
          />
          <CardTitle>
            <div>
              <Module>Play</Module>
              <br />
              Wordleverse
            </div>
          </CardTitle>
        </Card>
        <Card className="hashtag" href="/games/hashtag">
          <CardImage
            alt="Hashtag Screenshot"
            fill
            placeholder="blur"
            src={hashtag}
          />
          <CardTitle>
            <div>
              <Module>Play</Module>
              <br />
              Hashtag
            </div>
          </CardTitle>
        </Card>
        <Card className="tictacoverflow" href="/games/tic-tac-overflow">
          <CardArtwork aria-hidden="true" className="artwork">
            <TicTacOverflowArtwork />
          </CardArtwork>
          <CardTitle>
            <div>
              <Module>Play</Module>
              <br />
              Tic-Tac-Overflow
            </div>
          </CardTitle>
        </Card>
        <Card className="edgecase" href="/games/edge-case">
          <CardArtwork aria-hidden="true" className="artwork">
            <EdgeCaseArtwork />
          </CardArtwork>
          <CardTitle>
            <div>
              <Module>Play</Module>
              <br />
              Edge Case
            </div>
          </CardTitle>
        </Card>
        <Card className="connect404" href="/games/connect-404">
          <CardArtwork aria-hidden="true" className="artwork">
            <Connect404Artwork />
          </CardArtwork>
          <CardTitle>
            <div>
              <Module>Play</Module>
              <br />
              Connect 404
            </div>
          </CardTitle>
        </Card>
      </Container>
    </Section>
  );
}
