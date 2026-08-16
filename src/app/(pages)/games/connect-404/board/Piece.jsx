import styled from "@emotion/styled";

// The disc, and the initial stamped on it when the player has asked for one.
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
 * A plain coloured disc, because nobody in this game types a name — the initial
 * was always just the first letter of the colour. It was measured before it was
 * dropped: red against blue is CIEDE2000 51+ under protanopia, deuteranopia and
 * tritanopia alike, and both discs clear 3:1 against the board and against an
 * empty socket, so colour alone carries this board for the common colour-vision
 * deficiencies.
 *
 * The one vision it does not carry is luminance-only, where the two discs are
 * 1.3-2.2:1 apart and therefore the same disc. That is what `showInitials` is
 * for: a per-browser preference (`src/lib/pieceInitials.js`), off by default,
 * that puts the letter back exactly as it was. The rim stays either way — it is
 * what separates a piece from a socket and from its neighbours, and with the
 * letter gone it is doing more work, not less.
 *
 * @param {Object} props
 * @param {Object} props.player - A player descriptor from `players.js`
 * @param {Boolean} [props.showInitials] - Stamp the player's initial on the disc
 */
export const Piece = ({ player, showInitials = false }) => (
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
    {showInitials && (
      <text
        dominantBaseline="central"
        fontSize="9"
        textAnchor="middle"
        x="10"
        y="10.4"
      >
        {player.initial}
      </text>
    )}
  </Glyph>
);
