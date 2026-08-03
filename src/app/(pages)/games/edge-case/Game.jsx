"use client";

import { useCallback, useContext, useMemo } from "react";
import styled from "@emotion/styled";

import { getResult } from "./_lib";
import { Board } from "./board";
import { Announcer, Endgame, Scoreboard, Setup, TurnBanner } from "./components";
import { Context, drawEdge, newGame, setSetupOpen } from "./context";
import { playerFor } from "./players";
import { Toolbar } from "./Toolbar";

const Container = styled.div`
  align-items: center;
  display: flex;
  flex: 1 1 auto;
  flex-flow: column nowrap;
  gap: 0.75rem;
  justify-content: flex-start;
  padding: 3.5rem 1rem 1.5rem;
  position: relative;
  width: 100%;
`;

// One column, capped at a width where a 9-dot board's tap targets are still
// comfortable and a phone gets the whole thing edge to edge.
const Stack = styled.div`
  display: flex;
  flex-flow: column nowrap;
  gap: 0.75rem;
  max-width: 32rem;
  width: 100%;
`;

/**
 * The local hotseat game — the wiring between the store and the board.
 *
 * Everything the board needs is computed here and passed down, which is the
 * whole point: on one device the player IS whoever is on the clock, so
 * `youSlot` is `game.turn`. Online (#94), `youSlot` is the slot this browser
 * joined as and `interactive` becomes `youSlot === game.turn`, and the board
 * below does not change by a line.
 */
export default function Game() {
  const { state, dispatch } = useContext(Context);
  const { game, players, playerCount, setupOpen, size } = state;

  const result = useMemo(() => getResult(game), [game]);

  // Hotseat: the device belongs to whoever is up. This is the one line an
  // online room replaces.
  const youSlot = game.turn;
  const interactive = !game.finished;

  const you = playerFor(players, youSlot);

  // The mover kept the turn because they closed a box — worth saying out loud,
  // since "why is it still my turn?" is the rule newcomers trip over.
  const extraTurn =
    !game.finished &&
    (game.lastMove?.claimed.length ?? 0) > 0 &&
    game.lastMove.slot === game.turn;

  const onDraw = useCallback(
    (edge) => dispatch(drawEdge(edge, youSlot)),
    [dispatch, youSlot]
  );

  const onPlayAgain = useCallback(() => dispatch(newGame()), [dispatch]);

  const onSetupChange = useCallback(
    (options) => dispatch(newGame(options)),
    [dispatch]
  );

  return (
    <Container>
      <Toolbar
        boxes={result.boxes}
        claimed={result.claimed}
        onRestart={onPlayAgain}
        onToggleSetup={() => dispatch(setSetupOpen(!setupOpen))}
        setupOpen={setupOpen}
      />

      <Stack>
        {setupOpen && (
          <Setup
            onChange={onSetupChange}
            playerCount={playerCount}
            size={size}
          />
        )}

        <TurnBanner
          extraTurn={extraTurn}
          finished={game.finished}
          player={you}
        />

        <Scoreboard game={game} players={players} />

        <Board
          game={game}
          interactive={interactive}
          onDraw={onDraw}
          overlay={
            // The seam for #95: the count-up animation replaces the body of
            // `Endgame` and mounts in exactly this slot, sized to the board.
            result.finished ? (
              <Endgame
                game={game}
                onPlayAgain={onPlayAgain}
                players={players}
                result={result}
              />
            ) : null
          }
          players={players}
          youSlot={youSlot}
        />
      </Stack>

      <Announcer game={game} players={players} result={result} />
    </Container>
  );
}
