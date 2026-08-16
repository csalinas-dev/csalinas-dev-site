import { useCallback, useEffect, useRef, useState } from "react";

import { orbit } from "../_lib";
import { applyMoveToIds, emptyIds, orbitIds } from "../board/ids";
import { turnKey } from "./turnKey";

// How long the position the player built stays on screen before the board turns.
// The slide and the placement are one beat, the orbit is the next, and without a
// pause between them the marble is placed and gone in the same frame.
const PLACE_MS = 420;

// One press. Long enough to follow a marble around a corner with your eye.
const SPIN_MS = 460;

// Presses 2…6, which only happen on the turn that fills the board and runs into
// overtime. Six presses at the full duration is nearly three seconds of nobody's
// turn, so they are quicker — but none of them is ever SKIPPED, because the
// press that produced the line is the one the player needs to see.
const OVERTIME_SPIN_MS = 300;

// Nothing has been watched yet. A symbol rather than null or "": every real
// board has a `turnKey`, including a fresh one ("new:<slot>"), so the first
// effect after mount can tell "a game that has not started" from "a game that
// was already in progress when this component mounted" — online mounts into the
// second, and there is no "before" to animate from.
const UNWATCHED = Symbol("unwatched");

/** One fresh id per occupied square. Empty squares stay null. */
const mintIds = (cells, next) =>
  cells.map((occupant) => (occupant == null ? null : next()));

/**
 * The orbit, watched rather than jumped over.
 *
 * `playTurn` resolves a whole turn — slide, placement and every press — in one
 * call, so by the time this hook sees `game` the board is already at its final
 * position. That is the right shape for the engine and the wrong one for a
 * player, who needs to see where sixteen marbles went. So the sequence is played
 * back from the engine's own record of it:
 *
 *   frame 0            `lastTurn.cellsBeforeOrbit` — the position the player
 *                      built, held for PLACE_MS
 *   frames 1…spins     `orbit()` applied to the frame before it, once per press
 *
 * THE RENDERER DECIDES NOTHING. Frame `spins` is `game.cells` by construction,
 * because it is the same function applied the same number of times to the same
 * board. There is no assertion here and there does not need to be one; there is
 * also nothing to get wrong, which is the point of playing the engine's own
 * numbers back instead of re-deriving the rotation.
 *
 * The ids it returns are the COMMITTED ids while idle. A staged slide is layered
 * on top of them at render time by `Game`, never folded in here — fold it in and
 * the commit's frame 0 applies the same slide a second time, from a square the
 * first application already emptied, and the marble disappears.
 *
 * @param {Object} game - An engine state
 * @returns {Object} `{ cells, ids, spinning, spin, spins, spinMs }` — the board
 *   to draw, the marble ids that go with it, whether a sequence is running, which
 *   press is on screen (0 while the pre-orbit position is), how many there are,
 *   and how long the current move should take.
 */
export const useOrbitAnimation = (game) => {
  // The last SETTLED position. Starts as the board it was handed with no marbles
  // known — which is the empty board for a fresh game, and is reconciled below
  // for anything else. The page is prerendered, so the first client render has to
  // produce what the server did.
  const [committed, setCommitted] = useState(() => ({
    cells: game.cells,
    ids: emptyIds(),
  }));

  // The frame currently on screen, or null when nothing is playing.
  const [playback, setPlayback] = useState(null);
  const [spinning, setSpinning] = useState(false);

  const committedRef = useRef(committed);
  const timer = useRef(null);
  const counter = useRef(0);
  const watched = useRef(UNWATCHED);
  // Read in an effect rather than during render: the page is prerendered and the
  // server has no media queries.
  const reduced = useRef(false);

  const nextId = useCallback(() => {
    counter.current += 1;

    return counter.current;
  }, []);

  const cancel = useCallback(() => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  const settle = useCallback((next) => {
    committedRef.current = next;
    setCommitted(next);
    setPlayback(null);
    setSpinning(false);
  }, []);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    reduced.current = query.matches;

    const onChange = (event) => {
      reduced.current = event.matches;
    };

    query.addEventListener("change", onChange);

    return () => query.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const { lastTurn } = game;
    const key = turnKey(game);

    // Nothing new happened — a re-render for some other reason.
    //
    // BY VALUE, NOT BY IDENTITY, and that is not a tidy-up: online, `game`
    // arrives as a fresh `JSON.parse` on every resync and the same revision is
    // re-delivered deliberately (presence changes do not bump it, and the
    // polling fallback re-applies a snapshot every 2s). Compare the object and
    // the sixteen marbles spin again every time the opponent's connection
    // blinks. See `turnKey.js`.
    if (key === watched.current) return;

    const first = watched.current === UNWATCHED;
    watched.current = key;
    // The only place a running sequence is stopped: a NEW turn interrupts the
    // one on screen. See the note below on why this is not the cleanup's job.
    cancel();

    // A fresh board, a restart, or a rematch — including one pressed in the
    // middle of a sequence, which is why this cancels first. And a board that was
    // already in progress when this mounted has nothing to replay: there is no
    // "before" to animate from.
    if (lastTurn === null || first) {
      settle({ cells: game.cells, ids: mintIds(game.cells, nextId) });

      return;
    }

    // Frame 0: the slide applied to the committed ids, and a FRESH id on the
    // square the marble was placed on. A new key is a new DOM node, which is what
    // replays the placement's arrival instead of sliding some other marble into
    // it.
    const opening = {
      cells: lastTurn.cellsBeforeOrbit,
      ids: [...applyMoveToIds(committedRef.current.ids, lastTurn.move)],
    };
    opening.ids[lastTurn.place] = nextId();

    const frames = [opening];

    for (let press = 0; press < lastTurn.spins; press += 1) {
      const previous = frames[frames.length - 1];

      frames.push({
        cells: orbit(previous.cells),
        ids: orbitIds(previous.ids),
      });
    }

    // The board is in the same place either way; only the trip is missing.
    if (reduced.current) {
      settle(frames[frames.length - 1]);

      return;
    }

    // How long the move INTO press `k` takes. The first press is the one being
    // taught; the overtime presses are the ones being sat through.
    const duration = (press) => (press <= 1 ? SPIN_MS : OVERTIME_SPIN_MS);

    const show = (press) => {
      const frame = frames[press];

      if (press === frames.length - 1) {
        // The last frame IS `game.cells`, so handing it over to `committed` here
        // changes nothing on screen and the transform transition into it still
        // runs. `spinning` stays true until it has finished, or the board would
        // take a tap while the marbles were still moving.
        committedRef.current = frame;
        setCommitted(frame);
        setPlayback({ ...frame, spin: press, spinMs: duration(press) });

        timer.current = setTimeout(() => {
          timer.current = null;
          setPlayback(null);
          setSpinning(false);
        }, duration(press));

        return;
      }

      setPlayback({ ...frame, spin: press, spinMs: duration(press) });
      timer.current = setTimeout(
        () => show(press + 1),
        press === 0 ? PLACE_MS : duration(press)
      );
    };

    setSpinning(true);
    show(0);

    // THIS EFFECT RETURNS NO CLEANUP, AND THAT IS THE WHOLE POINT.
    //
    // A running sequence has to survive a re-render that changed nothing,
    // because online there are two of those per turn: `send({ optimistic: true })`
    // renders the turn from the local reducer, and the server's confirmation of
    // THE SAME TURN arrives ~50ms later as a different object with an identical
    // `turnKey`. Cancelling the timers from a cleanup meant that second render
    // killed the orbit at frame 0 and the early return above never restarted it —
    // the board froze mid-turn, `committed` stopped advancing, and marbles that
    // had never been settled were left with no id and therefore no DOM node. The
    // symptom was a board showing one marble while the room held three, and it
    // only ever appeared online.
    //
    // So the sequence's lifetime is the SEQUENCE's, not this effect's: a new turn
    // cancels the old one explicitly above, and unmount is handled once, below.
  }, [cancel, game, nextId, settle]);

  // The unmount path, and nothing else — no dependency that changes during a
  // game, so nothing here can interrupt an orbit that is still turning.
  useEffect(() => cancel, [cancel]);

  return {
    cells: playback?.cells ?? committed.cells,
    ids: playback?.ids ?? committed.ids,
    spinning,
    spin: playback?.spin ?? 0,
    spins: game.lastTurn?.spins ?? 0,
    spinMs: playback?.spinMs ?? SPIN_MS,
  };
};
