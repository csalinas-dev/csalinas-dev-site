// The four states a Wordleverse / Hashtag tile can be in, resolved from the
// CSS custom properties both games' Tile styles use (globals.css). `text` is
// null for the empty tile because no letter is drawn on one.
export const TILE_STATUS = {
  default: { fill: "rgba(173, 214, 255, 0.15)", text: null },
  absent: { fill: "rgba(40, 64, 88, 0.15)", text: "rgba(204, 204, 204, 0.54)" },
  present: { fill: "#d7ac57", text: "#1f1f1f" },
  correct: { fill: "#6a9955", text: "#cccccc" },
};
