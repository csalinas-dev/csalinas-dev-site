// Whether a game board stamps each piece with its player's initial.
//
// Off by default: in Connect 404 and Race Condition nobody types a name, so the
// initial was only ever the first letter of the colour — a piece is a coloured
// piece. On for anybody whose vision is luminance-only, where two fills of equal
// lightness are one fill; the two games' colours are far apart in hue but only
// 1.3-2.2:1 apart in contrast, so the letter is the second channel.
//
// ONE key for both games, because somebody who needs initials needs them
// everywhere and should not have to find the switch twice. It is a per-browser
// display preference and nothing else: it never reaches a room, never rides on
// `dispatch` (which online IS the wire), and cannot change what the other player
// sees or how the game runs.
//
// Both accessors swallow their errors. Storage can be unavailable — private
// browsing, a locked-down profile — and a game that refuses to draw a board
// because it could not read a preference would be an absurd trade.

export const PIECE_INITIALS_KEY = "CSALINAS-PIECE-INITIALS";

/**
 * @returns {?Boolean} The stored preference, or null when it has never been set.
 *   The caller has to tell "never chosen" from "chosen off" — only the first
 *   leaves the default alone.
 */
export const readPieceInitials = () => {
  if (typeof window === "undefined") return null;
  try {
    const saved = window.localStorage.getItem(PIECE_INITIALS_KEY);
    return saved === null ? null : saved === "true";
  } catch {
    return null;
  }
};

export const rememberPieceInitials = (enabled) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PIECE_INITIALS_KEY, String(enabled));
  } catch {
    // Nothing to do and nothing worth saying.
  }
};
