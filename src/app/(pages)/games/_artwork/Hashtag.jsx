import { TILE_STATUS } from "./tileStatus";

// A 5x5 grid with the even/even cells punched out, which is the hash the game
// is named for. The board is one move from solved: STACK and QUERY read down
// columns 1 and 3, STOUT across row 1, and row 3 becomes ACORN the moment the
// player swaps the N and the A on its ends — so those two are the only tiles
// the engine calls `present`. (Traced through getLetterStatuses: the correct
// pass eats row 3's C, O and R, leaving ACORN holding an A and an N for the
// present pass.)
const H_TILE = 52;
const H_STRIDE = 62;
// 5 * 52 + 4 * 10 = 300, so the board fills the viewBox exactly.
const H_LETTERS = [" S Q ", "STOUT", " A E ", "NCORA", " K Y "];
const H_PRESENT = new Set(["3-0", "3-4"]);

// The board's shape, verbatim from context/index.jsx — a cell that fails it is
// not drawn at all.
const isTile = (row, col) => row % 2 === 1 || col % 2 === 1;

const HashtagArtwork = () => {
  const tiles = [];
  for (let row = 0; row < 5; row += 1) {
    for (let col = 0; col < 5; col += 1) {
      if (!isTile(row, col)) continue;
      const key = `${row}-${col}`;
      tiles.push({
        key,
        letter: H_LETTERS[row][col],
        status: H_PRESENT.has(key) ? TILE_STATUS.present : TILE_STATUS.correct,
        x: col * H_STRIDE,
        y: row * H_STRIDE,
      });
    }
  }

  return (
    <svg viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg">
      {tiles.map(({ key, letter, status, x, y }) => (
        <g key={key}>
          <rect
            fill={status.fill}
            height={H_TILE}
            rx="5.2"
            width={H_TILE}
            x={x}
            y={y}
          />
          <text
            dominantBaseline="central"
            fill={status.text}
            fontSize="36"
            fontWeight="700"
            textAnchor="middle"
            x={x + H_TILE / 2}
            y={y + H_TILE / 2}
          >
            {letter}
          </text>
        </g>
      ))}
    </svg>
  );
};

export default HashtagArtwork;
