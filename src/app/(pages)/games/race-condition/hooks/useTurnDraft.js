import { useCallback, useEffect, useMemo, useState } from "react";

import { applyMove, emptyCells, legalMoves } from "../_lib";
import { turnKey } from "./turnKey";

/**
 * The turn being built, before any of it is a turn.
 *
 * A turn is committed as ONE action — slide, placement and press together — so
 * the half of it the player has decided so far cannot live in `state.game`;
 * there is no such state and the engine is right not to have one. It lives here,
 * in component state, and reaches the engine only when the placement completes
 * it.
 *
 * That staging is also what makes the two beats of a turn legible: while a slide
 * is staged the board shows the position it WOULD commit, and the placeable
 * squares are recomputed against it — which is how the rule players miss ("you
 * may place on the square the marble you just slid off") ends up being the
 * obvious thing on screen rather than a sentence in a rulebook.
 *
 * Every legality question here is a call into `_lib`. `moves` comes from
 * `legalMoves`, which reads the same `canMove` the engine enforces with, so a
 * slide this hook offers can never be refused; `preview` is `applyMove`, the
 * same step 1 `playTurn` runs; `placeable` is `emptyCells` of that. Nothing
 * about adjacency, ownership or emptiness is decided in this file.
 *
 * @param {Object} game - An engine state
 * @param {?(String|Number)} youSlot - The seat this device plays
 * @param {Boolean} interactive - Whether it may act right now
 * @returns {Object} `{ source, move, preview, moves, sources, destinations,
 *   placeable, selectCell, clear }`
 */
export const useTurnDraft = (game, youSlot, interactive) => {
  // The opponent marble picked up but not yet put down.
  const [source, setSource] = useState(null);
  // The slide staged so far, `{ from, to }` or null for "declined".
  const [move, setMove] = useState(null);

  const clear = useCallback(() => {
    setSource(null);
    setMove(null);
  }, []);

  // Anything half-decided belongs to the position it was decided on, so a
  // committed turn or a restart clears it.
  //
  // Keyed on the turn's VALUE and emphatically not on the `game` object: online
  // every resync is a fresh `JSON.parse` of a state that has not changed, and
  // the same revision is re-delivered whenever presence blinks (plus every 2s on
  // the polling fallback). Depending on `game` here would wipe a picked-up
  // marble out from under the player's finger a few seconds after they picked it
  // up, with nothing on screen to explain it. See `turnKey.js`.
  const key = turnKey(game);
  useEffect(() => clear(), [clear, key]);

  // And nothing may stay staged on a board this device has stopped being able to
  // act on — the opponent's turn, a finished game, an orbit in progress.
  useEffect(() => {
    if (!interactive) clear();
  }, [clear, interactive]);

  const moves = useMemo(
    () => (youSlot === null || youSlot === undefined ? [] : legalMoves(game, youSlot)),
    [game, youSlot]
  );

  // Only while nothing is staged. A turn gets ONE slide, and `moves` is computed
  // against `game.cells` — offering a second one would light up the square the
  // staged marble has already left. Tapping the marble where it now stands takes
  // the slide back instead; see `selectCell`.
  const sources = useMemo(
    () => (move === null ? new Set(moves.map((option) => option.from)) : new Set()),
    [move, moves]
  );

  const destinations = useMemo(
    () =>
      new Set(
        source === null
          ? []
          : moves.filter((option) => option.from === source).map((o) => o.to)
      ),
    [moves, source]
  );

  // `applyMove` hands back `game.cells` BY REFERENCE when nothing is staged, so
  // "no slide" costs no array and reads as the same board everywhere.
  const preview = useMemo(() => applyMove(game.cells, move), [game.cells, move]);

  const placeable = useMemo(
    () => (interactive ? new Set(emptyCells(preview)) : new Set()),
    [interactive, preview]
  );

  /**
   * Resolve a tap against the draft.
   *
   * Placing is the ONLY commit, and placing without having staged a slide *is*
   * declining step 1 — so there is no "skip the move" button, because "I am done
   * moving" and "here is my marble" are the same decision and asking for both
   * would make every turn one press longer than it is.
   *
   * @param {Number} index - The square that was activated
   * @returns {?{commit: {move: ?Object, place: Number}}} A turn to dispatch, or
   *   null when the tap only changed what is staged (or did nothing at all)
   */
  const selectCell = useCallback(
    (index) => {
      if (!interactive) return null;

      // Tap the marble you picked up to put it back down.
      if (source === index) {
        setSource(null);

        return null;
      }

      // Tap the marble you have already slid — where it now stands — to take the
      // slide back. That square is inert otherwise (the preview has it occupied,
      // so it is not placeable), and without this a mis-tapped slide would have
      // to be committed.
      if (move !== null && move.to === index) {
        setMove(null);

        return null;
      }

      // Somewhere the marble you are holding can go.
      if (source !== null && destinations.has(index)) {
        setMove({ from: source, to: index });
        setSource(null);

        return null;
      }

      // Pick a marble up, or change your mind about which one. Only ever the
      // opponent's, and only ever one with somewhere to go: `legalMoves` said so.
      if (sources.has(index)) {
        setSource(index);

        return null;
      }

      // The commit.
      if (placeable.has(index)) return { commit: { move, place: index } };

      // An inert square: your own marble, an opponent's with nowhere to go, or
      // one that a staged slide has filled.
      return null;
    },
    [destinations, interactive, move, placeable, source, sources]
  );

  return {
    source,
    move,
    preview,
    moves,
    sources,
    destinations,
    placeable,
    selectCell,
    clear,
  };
};
