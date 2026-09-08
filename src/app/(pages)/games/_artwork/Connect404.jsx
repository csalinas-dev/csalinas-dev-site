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

export default Connect404Artwork;
