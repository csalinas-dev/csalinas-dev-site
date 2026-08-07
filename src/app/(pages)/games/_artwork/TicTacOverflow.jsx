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

export default TicTacOverflowArtwork;
