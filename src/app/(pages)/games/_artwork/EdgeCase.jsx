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

export default EdgeCaseArtwork;
