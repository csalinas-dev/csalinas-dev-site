"use client";

import { useCallback, useContext, useMemo } from "react";
import styled from "@emotion/styled";

import { getResult } from "./_lib";
import { Board } from "./board";
import { Announcer, Endgame, TurnBanner } from "./components";
import { Context, dropPiece, newGame } from "./context";
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

// One column, capped where a seven-wide board's columns are still a comfortable
// thumb apart and a phone gets the whole thing edge to edge.
const Stack = styled.div`
  align-items: center;
  display: flex;
  flex-flow: column nowrap;
  gap: 0.75rem;
  max-width: 30rem;
  width: 100%;
`;

/**
 * The game — the wiring between the store and the board.
 *
 * Everything the board needs is computed here and passed down, which is the
 * whole point: this file does not know or care where its state came from. The
 * hotseat provider fills the context from a `useReducer`; an online game (#114)
 * fills the identical shape from a room. The only difference either makes is
 * the pair of facts below — which slot this device plays, and whether it may
 * move — and the board does not change by a line between them.
 *
 * @param {Object} props
 * @param {React.ReactNode} [props.banner] - Rendered above the board. An online
 *   game puts its room strip here.
 */
export default function Game({ banner }) {
  const { state, dispatch, online, showInitials } = useContext(Context);
  const { game, players } = state;

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
  // reads "Blue to move" while Red is thinking is worse than no banner.
  const mover = playerFor(players, game.turn);

  const onDrop = useCallback(
    (col) => dispatch(dropPiece(col, youSlot)),
    [dispatch, youSlot]
  );

  const onPlayAgain = useCallback(() => dispatch(newGame()), [dispatch]);

  return (
    <Container>
      <Toolbar
        cells={result.cells}
        moves={result.moves}
        /* Online there is no mid-game restart — a shared board is not one
           player's to wipe — so the rematch lives in the endgame panel and
           this button is simply absent. */
        onRestart={online ? null : onPlayAgain}
      />

      <Stack>
        {banner}

        <TurnBanner game={game} player={mover} />

        <Board
          game={game}
          interactive={interactive}
          onDrop={onDrop}
          players={players}
          showInitials={showInitials}
          youSlot={youSlot}
        />

        {result.finished && (
          <Endgame
            game={game}
            onPlayAgain={onPlayAgain}
            winner={
              result.winner === null ? null : playerFor(players, result.winner)
            }
          />
        )}
      </Stack>

      <Announcer game={game} players={players} />
    </Container>
  );
}
