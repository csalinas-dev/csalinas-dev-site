// A 4x4 board mid-game, with cyan's line down the second column and a ring
// around the outside saying the whole thing turns.
//
// That ring is the entire difference between this tile and a naughts-and-
// crosses grid, so it is drawn big, it hugs the board, and it runs
// COUNTER-CLOCKWISE — down the left, right along the bottom, up the right, left
// along the top — which is the direction `_lib/orbit.js` documents and the one
// the real board turns. A mirrored arrow would still look like a game; it just
// would not be this one.
//
// Colours are the two the board actually uses (`players.js`: cyan --component,
// gold --parenthesis), as literal hex because the tile sits on its own dark
// gradient rather than in the themed page.
// The board is deliberately smaller than the other tiles' boards: the ring has
// to sit clear of it to read as a ring rather than as a frame around it.
const RC_CELL = 40;
const RC_GAP = 8;
const RC_ORIGIN = 58;
const RC_CYAN = "#4fc1ff";
const RC_GOLD = "#ffd700";

// Row-major, index = row * 4 + col, row 0 on top — the engine's own convention.
const RC_CELLS = [
  "g", "c", null, "g",
  null, "c", "g", null,
  "g", "c", "g", "c",
  "c", "c", "g", null,
];

// The line the press just completed: the second column, top to bottom.
const RC_WIN = new Set([1, 5, 9, 13]);

const RC_FILL = { c: RC_CYAN, g: RC_GOLD };
const RC_INITIAL = { c: "C", g: "G" };

const rcAt = (index) => ({
  x: RC_ORIGIN + (RC_CELL + RC_GAP) * (index % 4),
  y: RC_ORIGIN + (RC_CELL + RC_GAP) * Math.floor(index / 4),
});

// One rounded-square lap, counter-clockwise from the middle of the top edge and
// stopping short of it, so the arrowhead has somewhere to point.
const RC_TRACK = [
  "M 150 30",
  "L 66 30",
  "A 36 36 0 0 0 30 66",
  "L 30 234",
  "A 36 36 0 0 0 66 270",
  "L 234 270",
  "A 36 36 0 0 0 270 234",
  "L 270 66",
  "A 36 36 0 0 0 234 30",
  "L 186 30",
].join(" ");

// Sweep flag 0 on every corner is what makes that lap COUNTER-clockwise, and the
// arrowhead below points left along the top edge for the same reason.
const RC_ARROW = "M 162 30 L 186 17 L 186 43 Z";
const RC_RING = "rgba(173, 214, 255, 0.8)";

const RaceConditionArtwork = () => (
  <svg viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg">
    {RC_CELLS.map((_, index) => {
      const { x, y } = rcAt(index);

      return (
        <rect
          fill="rgba(173, 214, 255, 0.15)"
          height={RC_CELL}
          key={index}
          rx="8"
          width={RC_CELL}
          x={x}
          y={y}
        />
      );
    })}

    {RC_CELLS.map((occupant, index) => {
      if (occupant === null) return null;

      const { x, y } = rcAt(index);
      const cx = x + RC_CELL / 2;
      const cy = y + RC_CELL / 2;
      const winning = RC_WIN.has(index);

      return (
        // Everything off the line steps back so the line can step forward,
        // exactly as the board itself does when a game is decided.
        <g key={index} opacity={winning ? 1 : 0.45}>
          <circle cx={cx} cy={cy} fill={RC_FILL[occupant]} r="16" />
          <text
            dominantBaseline="central"
            fill="#1e1e1e"
            fontSize="19"
            fontWeight="700"
            textAnchor="middle"
            x={cx}
            y={cy}
          >
            {RC_INITIAL[occupant]}
          </text>
        </g>
      );
    })}

    {/* The press: one lap of the board, counter-clockwise. */}
    <path
      d={RC_TRACK}
      fill="none"
      stroke={RC_RING}
      strokeLinecap="round"
      strokeWidth="9"
    />
    <path d={RC_ARROW} fill={RC_RING} />
  </svg>
);

export default RaceConditionArtwork;
