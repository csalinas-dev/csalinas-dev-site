import styled from "@emotion/styled";

// The disc, and the initial stamped on it.
//
// SVG rather than a text node so the letter scales with the board instead of
// with the root font size: the same markup has to look right in a 4rem cell on
// a desktop and a 45px one on a phone, and a `font-size` that works at one end
// is wrong at the other.
//
// The element fills its cell and the circle is inset inside it, rather than the
// element being the circle. That is deliberate: the drop animation moves this
// element by whole cells, so its height has to *be* one cell.
const Glyph = styled.svg`
  display: block;
  height: 100%;
  width: 100%;

  text {
    fill: var(--background);
    font-family: inherit;
    font-weight: 700;
  }
`;

// Cell units. The board's empty sockets are cut to the same radius, so a piece
// sits in one exactly.
export const PIECE_RADIUS = 8.6;

/**
 * A player's piece.
 *
 * The initial is not decoration. Red and blue is a kinder pair than most, but
 * the site's rule is that colour never carries a fact on its own, and "which of
 * these is mine" is the only fact this board has.
 *
 * @param {Object} props
 * @param {Object} props.player - A player descriptor from `players.js`
 */
export const Piece = ({ player }) => (
  <Glyph aria-hidden="true" viewBox="0 0 20 20">
    <circle
      cx="10"
      cy="10"
      fill={player.color}
      r={PIECE_RADIUS}
      /* A rim rather than a shadow: it survives the piece being drawn over an
         empty socket mid-fall, which a drop shadow does not. */
      stroke="rgba(0, 0, 0, 0.32)"
      strokeWidth="0.7"
    />
    <text
      dominantBaseline="central"
      fontSize="9"
      textAnchor="middle"
      x="10"
      y="10.4"
    >
      {player.initial}
    </text>
  </Glyph>
);
