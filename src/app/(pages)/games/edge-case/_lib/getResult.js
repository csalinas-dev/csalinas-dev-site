import { boxCount } from "./edges";

/**
 * Who is winning, or who won.
 *
 * A draw is a real result in Dots and Boxes, not something to break with a
 * coin flip: `winner` is null whenever two or more players share the top score,
 * and `leaders` names all of them. Read `tie` before `winner`.
 *
 * @param {Object} state - A game state, finished or not
 * @returns {Object} standings (sorted, ranked), leaders, winner, tie, boxes,
 *   claimed and finished
 */
export const getResult = (state) => {
  const { finished, scores, slots } = state;

  // Join order is the tie-break for display only — it never picks a winner.
  const standings = slots
    .map((slot) => ({ slot, score: scores[slot] ?? 0 }))
    .sort((a, b) => b.score - a.score || slots.indexOf(a.slot) - slots.indexOf(b.slot));

  const top = standings[0]?.score ?? 0;
  const leaders = standings
    .filter(({ score }) => score === top)
    .map(({ slot }) => slot);

  // Players on the same score share a rank: 1, 1, 3, 4.
  let rank = 0;
  let previous = null;
  const ranked = standings.map((standing, position) => {
    if (standing.score !== previous) {
      rank = position + 1;
      previous = standing.score;
    }

    return { ...standing, rank };
  });

  const tie = leaders.length > 1;

  return {
    standings: ranked,
    leaders,
    // Null while the game is live, and null on a draw. `leaders` is the field
    // to render in both cases.
    winner: finished && !tie ? leaders[0] : null,
    tie,
    boxes: boxCount(state),
    claimed: standings.reduce((total, { score }) => total + score, 0),
    finished,
  };
};
