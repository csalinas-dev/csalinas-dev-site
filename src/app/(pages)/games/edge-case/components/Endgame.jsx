"use client";

import {
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import styled from "@emotion/styled";
import { keyframes } from "@emotion/react";
import { clamp } from "lodash";

import { playerFor } from "../players";
import { VisuallyHidden } from "./VisuallyHidden";

// How long the leader's counter runs. Every counter starts at the same instant
// and ticks at the same rate, so this is also the longest any of them can take.
const RACE_MS = 1900;

// Floor and ceiling on a single box tick, so the rate stays watchable at both
// ends of the board sizes: a 2-box lead does not flash past before the eye
// lands on it, and a 64-box board does not crawl.
const MIN_TICK_MS = 55;
const MAX_TICK_MS = 260;

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

const subscribeToMotion = (onChange) => {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};

const motionSnapshot = () => window.matchMedia(REDUCED_MOTION).matches;

// The page is prerendered, but this component only ever mounts on a finished
// game — the server never renders it, so there is nothing to mismatch.
const motionServerSnapshot = () => false;

const usePrefersReducedMotion = () =>
  useSyncExternalStore(subscribeToMotion, motionSnapshot, motionServerSnapshot);

/**
 * The count-up itself: ONE rAF loop, ONE piece of state.
 *
 * Deliberately one shared "boxes counted so far" step that each row clamps to
 * its own score, rather than a timer per player. The whole reveal rests on the
 * counters being in lockstep — everyone starts together, everyone ticks
 * together, and the winner is simply the last one still moving. Separate timers
 * drift apart within a second and turn the race into a staggered list.
 *
 * A CSS animation was the alternative and cannot do this: counting needs a
 * whole number on screen every tick, and `@property` counter tricks are neither
 * portable nor readable by assistive tech.
 *
 * It re-renders once per tick rather than once per frame, because the step is
 * an integer — eight renders for an eight-box lead, not a hundred and ten.
 *
 * @param {Number} top - The leading score; the count is over when it is reached
 * @param {Boolean} animate - False under `prefers-reduced-motion`
 * @returns {Number} Boxes counted off so far, shared by every row
 */
const useCountUp = (top, animate) => {
  const tickMs = clamp(RACE_MS / Math.max(top, 1), MIN_TICK_MS, MAX_TICK_MS);
  const [step, setStep] = useState(() => (animate ? 0 : top));

  useEffect(() => {
    if (!animate) {
      setStep(top);
      return undefined;
    }

    setStep(0);

    let frame = 0;
    const start = performance.now();

    const tick = (now) => {
      const counted = Math.min(top, Math.floor((now - start) / tickMs));
      // Functional update so an unchanged step bails out of rendering entirely.
      setStep((current) => (current === counted ? current : counted));

      if (counted < top) {
        frame = requestAnimationFrame(tick);
      }
    };

    frame = requestAnimationFrame(tick);

    // A rematch starts the instant the button is pressed, which unmounts this
    // mid-count — never leave a frame scheduled against a dead component.
    return () => cancelAnimationFrame(frame);
  }, [animate, tickMs, top]);

  return step;
};

const list = (items) =>
  items.length < 2
    ? items.join("")
    : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;

const reveal = keyframes`
  from { opacity: 0; transform: translateY(-0.25rem); }
  to   { opacity: 1; transform: translateY(0); }
`;

const Overlay = styled.div`
  align-items: center;
  /* Translucent, not opaque: the finished board is the result, and covering it
     up to announce the result would be a strange thing to do. */
  background-color: rgba(31, 31, 31, 0.82);
  border-radius: 0.75rem;
  display: flex;
  flex-flow: column nowrap;
  gap: 1rem;
  inset: 0;
  justify-content: center;
  padding: 1.5rem;
  position: absolute;
  text-align: center;
`;

const Headline = styled.h2`
  font-size: 1.5rem;
  line-height: 1.9rem;
  margin: 0;
  /* Held open from the first frame. The verdict lands only once the last
     counter stops, and the standings underneath must not jump when it does. */
  min-height: 1.9rem;

  .slot {
    color: var(--slot);
  }

  .verdict {
    animation: ${reveal} 260ms ease-out both;
  }

  @media (prefers-reduced-motion: reduce) {
    .verdict {
      animation: none;
    }
  }
`;

const Standings = styled.ol`
  display: flex;
  flex-flow: column nowrap;
  gap: 0.35rem;
  list-style: none;
  margin: 0;
  max-width: 18rem;
  padding: 0;
  width: 100%;
`;

const Row = styled.li`
  align-items: center;
  border-radius: 0.4rem;
  display: flex;
  flex-flow: row nowrap;
  gap: 0.5rem;
  /* The bar sits behind the row, so it needs a stacking context and a little
     breathing room to read as a fill rather than a border. */
  overflow: hidden;
  padding: 0.2rem 0.35rem;
  position: relative;

  /* The race, made visible. The number is the truth, but a bar growing at the
     same rate in four lanes is what makes "still counting" legible from across
     a room — and it is the same data, so it costs nothing in honesty. */
  .lane {
    background-color: var(--slot);
    bottom: 0;
    left: 0;
    opacity: 0.16;
    position: absolute;
    top: 0;
    /* No CSS transition: the width is driven by the same rAF step as the
       number, and a transition would let the bar lag behind its own count. */
    z-index: 0;
  }

  .chip,
  .name,
  .score {
    position: relative;
    z-index: 1;
  }

  .chip {
    align-items: center;
    background-color: var(--slot);
    border-radius: 0.35rem;
    color: var(--background);
    display: inline-flex;
    flex: 0 0 auto;
    font-size: 0.85rem;
    font-weight: 700;
    height: 1.5rem;
    justify-content: center;
    width: 1.5rem;
  }

  .name {
    color: var(--slot);
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    text-align: left;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .score {
    flex: 0 0 auto;
    font-variant-numeric: tabular-nums;
    font-weight: 700;
  }

  /* Whoever is still counting when the others have stopped. Marked once the
     race is over, so it never previews the answer. */
  &.leader .score {
    color: var(--slot);
  }
`;

const Again = styled.button`
  background-color: var(--selectionBackground);
  border: 1px solid var(--component);
  border-radius: 0.4rem;
  color: var(--component);
  cursor: pointer;
  font-size: 1rem;
  min-height: 2.75rem;
  padding: 0.5rem 1.25rem;

  &:focus-visible {
    outline: 2px solid var(--var);
    outline-offset: 2px;
  }
`;

/**
 * The end of the game — the count-up, the verdict, and the rematch.
 *
 * Props (the contract with `Game`, and with an online room):
 *
 *   game        the finished engine state
 *   players     player descriptors in join order — { slot, name, initial, color }
 *   result      `getResult(game)`: { standings, leaders, winner, tie, boxes,
 *               claimed, finished }. `standings` is already sorted and ranked.
 *   onPlayAgain () => void — dispatches a fresh game with the same settings
 *
 * `Game` renders this inside the board frame, absolutely positioned over the
 * board, and only when `result.finished` is true.
 *
 * Every counter starts at zero at the same instant and climbs at the same rate,
 * so the one still moving when the rest have stopped is the winner. That is the
 * announcement, and the verdict underneath only confirms what the race showed —
 * which is why nothing names a winner until the last counter lands.
 *
 * Ties are reported as ties. `result.winner` is null whenever the top score is
 * shared, and the engine will not break it; neither will this. (`result.tie` is
 * also true on a live 0–0 game, which is harmless here — the overlay only
 * mounts once `finished`.)
 *
 * Nothing is conveyed by motion alone: the verdict is text, the standings are a
 * list, every player carries their initial next to their colour, and the final
 * result reaches a screen reader through the live region at the bottom — once,
 * when the count lands, rather than on every tick.
 */
export const Endgame = ({ game, onPlayAgain, players, result }) => {
  const { leaders, standings, tie, winner } = result;

  const reducedMotion = usePrefersReducedMotion();
  const top = standings[0]?.score ?? 0;
  const step = useCountUp(top, !reducedMotion);
  const done = step >= top;

  const champion = playerFor(players, winner ?? leaders[0]);
  const boxes = game.owners.length;

  const summary = useMemo(() => {
    const verdict = tie
      ? `Tie at ${top} ${top === 1 ? "box" : "boxes"} between ${list(
          leaders.map((slot) => playerFor(players, slot).name)
        )}.`
      : `${champion.name} wins with ${top} of ${boxes} boxes.`;

    const scores = standings.map(({ slot, score }) => {
      const player = playerFor(players, slot);
      return `${player.name} ${score}`;
    });

    return `Game over. ${verdict} Final scores: ${list(scores)}.`;
  }, [boxes, champion.name, leaders, players, standings, tie, top]);

  // The live region is mounted empty and filled a frame after the count lands.
  // Filling it on the same commit it mounts on is the one case several screen
  // readers skip, and holding it back until `done` is what keeps the tick-by-
  // tick numbers out of it.
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    if (!done) {
      return undefined;
    }

    const frame = requestAnimationFrame(() => setAnnouncement(summary));
    return () => cancelAnimationFrame(frame);
  }, [done, summary]);

  return (
    <Overlay aria-label="Final result" role="dialog">
      <Headline style={{ "--slot": champion.color }}>
        {done && (
          <span className="verdict">
            {tie ? (
              <>
                Tie at {top} —{" "}
                {leaders.map((slot, index) => {
                  const player = playerFor(players, slot);

                  return (
                    <span key={slot}>
                      {index > 0 && (index === leaders.length - 1 ? " and " : ", ")}
                      <span style={{ color: player.color }}>{player.name}</span>
                    </span>
                  );
                })}
              </>
            ) : (
              <>
                <span className="slot">{champion.name}</span> wins
              </>
            )}
          </span>
        )}
      </Headline>

      <Standings>
        {standings.map(({ slot, score }) => {
          const player = playerFor(players, slot);
          // Every row counts from the same shared step and simply stops at its
          // own score. This one line is the whole simultaneity guarantee.
          const count = Math.min(score, step);

          return (
            <Row
              className={done && leaders.includes(slot) ? "leader" : undefined}
              key={slot}
              style={{ "--slot": player.color }}
            >
              <span
                aria-hidden="true"
                className="lane"
                style={{ width: `${boxes > 0 ? (count / boxes) * 100 : 0}%` }}
              />
              <span aria-hidden="true" className="chip">
                {player.initial}
              </span>
              <span className="name">{player.name}</span>
              <span className="score">
                {count}
                <span aria-hidden="true"> / {boxes}</span>
                <VisuallyHidden> {count === 1 ? "box" : "boxes"}</VisuallyHidden>
              </span>
            </Row>
          );
        })}
      </Standings>

      <Again autoFocus onClick={onPlayAgain} type="button">
        Play again
      </Again>

      <VisuallyHidden aria-atomic="true" aria-live="polite" role="status">
        {announcement}
      </VisuallyHidden>
    </Overlay>
  );
};
