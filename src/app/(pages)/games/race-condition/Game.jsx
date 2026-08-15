"use client";

import { useCallback, useContext, useMemo } from "react";
import styled from "@emotion/styled";

import { applyMove, CELLS, getResult } from "./_lib";
import { applyMoveToIds, Board } from "./board";
import { Announcer, Endgame, TurnBanner } from "./components";
import { Context, newGame, playTurn } from "./context";
import { useOrbitAnimation, useTurnDraft } from "./hooks";
import { opponentOf, playerFor } from "./players";
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
 * This file does not know or care where its state came from. The hotseat
 * provider fills the context from a `useReducer`; an online room (#144) fills
 * the identical shape from a room. `canPlay` is the ONLY authority on whether
 * this device may act and `online?.youSlot` is the ONLY source of which seat it
 * holds — neither is re-derived from `game.turn` here, because online they are
 * usually different people.
 *
 * @param {Object} props
 * @param {React.ReactNode} [props.banner] - Rendered above the board. An online
 *   game puts its room strip here.
 */
export default function Game({ banner }) {
  const { canPlay, canReset, dispatch, online, state } = useContext(Context);
  const { game, players } = state;

  const result = useMemo(() => getResult(game), [game]);

  // Hotseat: the device belongs to whoever is up. Online: to the seat this
  // browser holds, resolved by the server from its token. A spectator has no
  // seat, so this is null and nothing on the board is live.
  const youSlot = online ? online.youSlot : game.turn;

  const anim = useOrbitAnimation(game);

  // The board is closed while it is turning. Not because a turn sent mid-orbit
  // would be illegal — the engine would take it — but because the position on
  // screen is not the position it would be judged against, and a player should
  // never be asked to act on a board they are still watching move.
  const interactive =
    canPlay && !anim.spinning && youSlot !== null && youSlot !== undefined;

  const draft = useTurnDraft(game, youSlot, interactive);

  // The staged slide is LAYERED ON at render time and never folded into the
  // animation's own state. `anim.ids` are the COMMITTED ids while idle, so this
  // is a first application every time; fold it in instead and the commit's
  // frame 0 would apply the same slide a second time, from a square the first
  // application already emptied, and the marble would vanish.
  const showing = draft.move !== null && !anim.spinning;
  const cells = showing ? applyMove(anim.cells, draft.move) : anim.cells;
  const ids = showing ? applyMoveToIds(anim.ids, draft.move) : anim.ids;

  // Every square in every completed line, in one flat order — that order is the
  // stagger. `winningLines` holds BOTH colours' lines on a simultaneous draw and
  // each line is coloured by the marble standing on it, so nothing here has to
  // pick a winner to highlight.
  const winningOrder = useMemo(
    () => (result.winningLines ?? []).flat(),
    [result.winningLines]
  );

  const winningCells = useMemo(
    () => (result.finished ? new Set(winningOrder) : null),
    [result.finished, winningOrder]
  );

  // Whose name the banner says is on the clock. NOT `youSlot`.
  const onTheClock = playerFor(players, game.turn);
  const opponent = opponentOf(players, game.turn);

  // WHO WON, IN ONE PLACE. Every part of the screen that names a winner — the
  // banner, the panel — takes it from here, so they cannot disagree.
  //
  // It is `result.winner`, read off the board, and it is emphatically NOT
  // `game.turn`: the engine deliberately leaves the turn with whoever ENDED the
  // game so the board is never without a valid slot, and pressing the button
  // turns sixteen marbles, so ending the game and winning it are different
  // events. They differ in 38.5% of decided games. Anything that derives a
  // winner from `game.turn` is wrong more than a third of the time, and the
  // shape of that bug is a second derivation living somewhere else — so there
  // is only this one.
  const outcome = useMemo(() => {
    const winner =
      result.winner === null ? null : playerFor(players, result.winner);
    const lastMover =
      game.lastTurn === null ? null : playerFor(players, game.lastTurn.by);

    return {
      winner,
      lastMover,
      // The mover pressed the button and turned somebody ELSE into a line —
      // the best moment this game has, and worth saying out loud.
      orbitedIn:
        winner !== null && lastMover !== null && winner.slot !== lastMover.slot,
    };
  }, [game.lastTurn, players, result.winner]);

  const onCellActivate = useCallback(
    (index) => {
      // Named `staged`, not `outcome`: the memo above is how the game ENDED and
      // this is what the tap staged. They are different things and one of them
      // was shadowing the other.
      const staged = draft.selectCell(index);

      if (staged?.commit) {
        dispatch(playTurn(staged.commit.move, staged.commit.place, youSlot));
      }
    },
    [dispatch, draft, youSlot]
  );

  const onPlayAgain = useCallback(() => dispatch(newGame()), [dispatch]);

  return (
    <Container>
      <Toolbar
        cells={CELLS}
        /* Online there is no mid-game restart — a shared board is not one
           player's to wipe — so the rematch lives in the endgame panel and this
           button is simply absent. */
        onRestart={online || !canReset ? null : onPlayAgain}
        placed={result.placed}
      />

      <Stack>
        {banner}

        <TurnBanner
          draft={draft}
          game={game}
          /* Online, the sub-line is the room's to write: "waiting for Gold…"
             rather than coaching aimed at whoever is on the clock. Undefined
             hotseat, which lets the banner's own `beat()` run. */
          hint={online?.hint}
          opponent={opponent}
          outcome={outcome}
          player={onTheClock}
          spinning={anim.spinning}
        />

        <Board
          cells={cells}
          decided={result.finished && winningOrder.length > 0}
          draft={draft}
          ids={ids}
          interactive={interactive}
          onCellActivate={onCellActivate}
          players={players}
          spin={anim.spin}
          spinMs={anim.spinMs}
          spinning={anim.spinning}
          spins={anim.spins}
          winningCells={winningCells}
          winningOrder={winningOrder}
          youSlot={youSlot}
        />

        {/* Held until the sequence has settled: the result is about the board
            the player is about to see, not the one still turning. */}
        {result.finished && !anim.spinning && (
          <Endgame
            onPlayAgain={canReset ? onPlayAgain : undefined}
            outcome={outcome}
            result={result}
          />
        )}
      </Stack>

      <Announcer game={game} outcome={outcome} players={players} />
    </Container>
  );
}
