import { TILE_STATUS } from "./tileStatus";

// Six rows of five, the board the game actually deals — a solve of DEBUG in
// three guesses, chosen because it puts all four tile states on one board and
// still leaves the empty rows that say how long a game is. The statuses are the
// real ones for these words against that answer; changing a word means
// re-deriving its row.
const W_ROWS = 6;
const W_TILE = 44;
const W_STRIDE = 51;
// 5 * 44 + 4 * 7 = 248, centred in 300. Six rows come to 299, so the board is
// top-aligned and the spare unit falls off the bottom.
const W_ORIGIN_X = 26;
const GUESSES = [
  { word: "BUILD", statuses: ["present", "present", "absent", "absent", "present"] },
  { word: "DEBUT", statuses: ["correct", "correct", "correct", "correct", "absent"] },
  { word: "DEBUG", statuses: ["correct", "correct", "correct", "correct", "correct"] },
];

const WordleverseArtwork = () => {
  const tiles = [];
  for (let row = 0; row < W_ROWS; row += 1) {
    const guess = GUESSES[row];
    for (let col = 0; col < 5; col += 1) {
      const status = guess ? TILE_STATUS[guess.statuses[col]] : TILE_STATUS.default;
      tiles.push({
        key: `${row}-${col}`,
        letter: guess ? guess.word[col] : null,
        status,
        x: W_ORIGIN_X + col * W_STRIDE,
        y: row * W_STRIDE,
      });
    }
  }

  return (
    <svg viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg">
      {tiles.map(({ key, letter, status, x, y }) => (
        <g key={key}>
          <rect
            fill={status.fill}
            height={W_TILE}
            rx="4"
            width={W_TILE}
            x={x}
            y={y}
          />
          {/* An unplayed row is a blank tile, never a blank letter. */}
          {status.text && (
            <text
              dominantBaseline="central"
              fill={status.text}
              fontSize="30"
              fontWeight="700"
              textAnchor="middle"
              x={x + W_TILE / 2}
              y={y + W_TILE / 2}
            >
              {letter}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
};

export default WordleverseArtwork;
