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
 * The game — the wiring between the store and the board.
 *
 * Everything the board needs is computed here and passed down, which is the
 * whole point: this file does not know or care where its state came from. The
 * hotseat provider fills the context from a `useReducer`; `OnlineGame` fills the
 * identical shape from a room. The only difference either makes is the pair of
 * facts below — which slot this device plays, and whether it may move — and the
 * board does not change by a line between them.
 *
 * @param {Object} props
 * @param {React.ReactNode} [props.banner] - Rendered above the board. The
 *   online game puts its room strip here.
 */
export default function Game({ banner }) {
  const { state, dispatch, online } = useContext(Context);
  const { game, players, playerCount, setupOpen, size } = state;

  const result = useMemo(() => getResult(game), [game]);

  // Hotseat: the device belongs to whoever is up. Online: to the seat this
  // browser holds — resolved by the server from its token — and only while the
  // clock is on that seat. A spectator has no seat, so `youSlot` is null and
  // nothing on the board is live.
  const youSlot = online ? online.youSlot : game.turn;
  const interactive = online
    ? youSlot !== null && youSlot === game.turn && !game.finished
    : !game.finished;

  // Whose name the banner says is on the clock. NOT `youSlot`: on one device
  // they are the same player and online they are usually not, and a banner that
  // reads "Alex to move" while Chris is thinking is worse than no banner.
  const mover = playerFor(players, game.turn);

  // The mover kept the turn because they closed a box — worth saying out loud,
  // since "why is it still my turn?" is the rule newcomers trip over.
  const extraTurn =
    !game.finished &&
    (game.lastMove?.claimed.length ?? 0) > 0 &&
    game.lastMove.slot === game.turn;

  // Online, "whose turn is it" and "can I do anything about it" are separate
  // facts and the banner is where a player looks for both.
  const hint =
    online && !game.finished && !interactive
      ? `Waiting for ${mover.name}…`
      : undefined;

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
        /* Online there is no "restart": a shared board is not one player's to
           wipe. There is only a rematch, and only once the game is over. */
        onRestart={!online || game.finished ? onPlayAgain : null}
        /* Size and player count are the host's, settled in the lobby. */
        onToggleSetup={
          online ? null : () => dispatch(setSetupOpen(!setupOpen))
        }
        setupOpen={setupOpen}
      />

      <Stack>
        {banner}

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
          hint={hint}
          player={mover}
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
