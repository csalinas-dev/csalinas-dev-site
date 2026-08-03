import styled from "@emotion/styled";

import { playerFor } from "../players";

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

  .slot {
    color: var(--slot);
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
  display: flex;
  flex-flow: row nowrap;
  gap: 0.5rem;

  .chip {
    align-items: center;
    background-color: var(--slot);
    border-radius: 0.35rem;
    color: var(--background);
    display: inline-flex;
    font-size: 0.85rem;
    font-weight: 700;
    height: 1.5rem;
    justify-content: center;
    width: 1.5rem;
  }

  .name {
    color: var(--slot);
    flex: 1 1 auto;
    text-align: left;
  }

  .score {
    font-variant-numeric: tabular-nums;
    font-weight: 700;
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
 * The end of the game.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * SEAM FOR #95 — the count-up animation.
 *
 * This is the mount point, and the props below are the whole contract:
 *
 *   game        the finished engine state
 *   players     player descriptors in join order — { slot, name, initial, color }
 *   result      `getResult(game)`: { standings, leaders, winner, tie, boxes,
 *               claimed, finished }. `standings` is already sorted and ranked.
 *   onPlayAgain () => void — dispatches a fresh game with the same settings
 *
 * `Game` renders this inside the board frame, absolutely positioned over the
 * board, and only when `result.finished` is true. What is below is a plain
 * static result: replace the body, keep the props.
 *
 * Two things to know before animating: `result.tie` is TRUE on a live 0–0 game,
 * so it only means anything once `finished`; and the engine deliberately leaves
 * `game.turn` on the final mover, so there is always a valid slot and colour on
 * screen.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const Endgame = ({ game, onPlayAgain, players, result }) => {
  const { standings, leaders, tie, winner } = result;
  const champion = playerFor(players, winner ?? leaders[0]);

  return (
    <Overlay>
      <Headline style={{ "--slot": champion.color }}>
        {tie ? (
          <>
            Tied at {standings[0].score} —{" "}
            {leaders
              .map((slot) => playerFor(players, slot).name)
              .join(" and ")}
          </>
        ) : (
          <>
            <span className="slot">{champion.name}</span> wins
          </>
        )}
      </Headline>

      <Standings>
        {standings.map(({ slot, score }) => {
          const player = playerFor(players, slot);

          return (
            <Row key={slot} style={{ "--slot": player.color }}>
              <span aria-hidden="true" className="chip">
                {player.initial}
              </span>
              <span className="name">{player.name}</span>
              <span className="score">
                {score}
                <span aria-hidden="true"> / {game.owners.length}</span>
              </span>
            </Row>
          );
        })}
      </Standings>

      <Again autoFocus onClick={onPlayAgain} type="button">
        Play again
      </Again>
    </Overlay>
  );
};
