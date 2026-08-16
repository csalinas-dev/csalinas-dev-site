"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { readPieceInitials } from "@/lib/pieceInitials";
import { absenceOf } from "@/lib/realtime/absence";
import { useRoom } from "@/lib/realtime/useRoom";

import {
  Button,
  Panel,
  PanelActions,
  PanelHeading,
  PanelText,
} from "../components";
import { Context } from "../context";
import { NEW_GAME, PLAY_TURN } from "../context/actions";
import Game from "../Game";
import { RC_GAME_ID, SEATS } from "../multiplayer";
import { createPlayers, playerFor } from "../players";
import { OnlineBar } from "./OnlineBar";
import { RoomCode } from "./RoomCode";

/**
 * Online Race Condition: the same board, driven by a realtime room.
 *
 * This component's whole job is to fill the game's context from `useRoom`
 * instead of from a `useReducer`. The board, the turn banner, the announcer and
 * the endgame panel do not know the difference, which is the point — there is
 * one board in this codebase, not two.
 */
export const OnlineGame = ({ code, onLeave }) => {
  const {
    connected,
    error,
    leave,
    me,
    players: seats,
    room,
    send,
    spectating,
    state: game,
    status,
  } = useRoom({ code, game: RC_GAME_ID });

  const [notice, setNotice] = useState(null);

  // Whether THIS browser stamps the initial on its marbles. Deliberately not in
  // the room's state: both players set it independently, and pressing the toggle
  // sends nothing and moves no revision. It is restored after mount for the same
  // reason the hotseat provider does it — the page is prerendered.
  const [showInitials, setShowInitials] = useState(false);

  useEffect(() => {
    const saved = readPieceInitials();
    if (saved !== null) setShowInitials(saved);
  }, []);

  // The seat this browser holds, resolved by the server from its token. Null for
  // a spectator, which is what closes the board to them.
  const youSlot = me?.slot ?? null;
  // Null for a spectator on purpose: they are not playing anybody, and picking
  // one of the two seats arbitrarily would put "so-and-so left the game" on a
  // screen that has no stake in it.
  const opponentSeat =
    youSlot === null
      ? null
      : (seats.find((seat) => seat.slot !== youSlot) ?? null);

  // The board's cast, built by the same function the hotseat game uses so the
  // colours, initials and fallbacks are identical in both modes.
  //
  // WITH NO NAMES AT ALL, deliberately. This game has no name-entry UI, so every
  // seat would come back from the core as its placeholder — "Player 1" and
  // "Player 2" — and both of those initial as "P". That is the whole reason the
  // initial is only ever the first letter of the colour here, and it still
  // matters: a player who turns the initials preference on has to get a C and a
  // G, not two Ps. Nameless, `createPlayers` falls back to the colours, and both
  // modes call the players Cyan and Gold.
  const cast = useMemo(() => createPlayers([...SEATS]), []);

  // Which is also where the opponent's NAME comes from — "Gold", not the core's
  // "Player 2". The strip, the banner's hint and the "they left" sentence are
  // all read next to a board that calls them Gold, and two names for one player
  // in one glance is worse than either name on its own.
  const opponent =
    opponentSeat === null ? null : playerFor(cast, opponentSeat.slot);
  const opponentName = opponent?.name ?? "your opponent";

  // Walking away is not the same as navigating away. Giving the seat up first
  // is what turns "the board just stopped" into a sentence on the other
  // player's screen; without it they wait out the presence timeout for news
  // that was available the instant this button was pressed.
  const quit = useCallback(async () => {
    await leave();
    onLeave();
  }, [leave, onLeave]);

  // A turn goes over the wire without the slot the hotseat action carries: the
  // server resolves who moved from the request's token, and a slot in a body is
  // a slot somebody can lie about. Everything else — whether that marble is the
  // opponent's, whether the squares are adjacent, how many times the board turns
  // afterwards — is the engine's, and it is the same engine at both ends.
  const play = useCallback(
    async (move, place) => {
      const result = await send({ type: PLAY_TURN, move, place }, { optimistic: true });

      if (result.ok) {
        setNotice(null);
        return;
      }

      // DELIBERATELY NOT CONNECT 404'S RETRY-ONCE. There, a 409 means the same
      // piece falls down the same column against a board that only grew, so
      // re-sending the identical action is still the move the player chose.
      // Here it is not: every index in `{ move, place }` names a square on the
      // board that was on screen, and the turn we missed ENDED BY ROTATING ALL
      // SIXTEEN OF THEM. Replaying it would commit a different turn than the one
      // that was clicked — sliding a marble the player never picked up. `send`
      // has already applied the board we missed, so the honest thing is to say
      // so and let them look at it and pick again.
      setNotice(
        result.error === "stale-revision"
          ? "Your opponent moved first and the board has turned. Take your turn again."
          : (result.message ?? null)
      );
    },
    [send]
  );

  const rematch = useCallback(async () => {
    const result = await send({ type: NEW_GAME });
    // Both players may reach for it at once. Losing that race is not something
    // to put on screen — the new board is already on its way.
    const raced =
      result.error === "stale-revision" || result.error === "rejected";
    setNotice(result.ok || raced ? null : (result.message ?? null));
  }, [send]);

  // The hotseat store's action creators, answered over the wire. Same actions
  // in, same board out; only the authority moved.
  const dispatch = useCallback(
    (action) => {
      switch (action?.type) {
        case PLAY_TURN:
          play(action.move, action.place);
          break;
        case NEW_GAME:
          rematch();
          break;
        default:
          break;
      }
    },
    [play, rematch]
  );

  // The sub-line the banner shows instead of its own coaching. Null hands the
  // beat back to `TurnBanner`, which is what should happen on your own turn and
  // once the game has an ending to describe.
  const hint = useMemo(() => {
    if (!game || game.finished) return null;
    if (spectating) return "You are watching this game.";
    if (youSlot === game.turn) return null;
    return `Waiting for ${opponentName}…`;
  }, [game, opponentName, spectating, youSlot]);

  const store = useMemo(
    () => ({
      state: { game, players: cast },
      dispatch,
      // THE ONLY PLACE THE TURN CHECK LIVES. `Game` ANDs it with "the board is
      // not mid-orbit", which is what stops a tap landing on a board that is
      // still turning.
      canPlay: youSlot !== null && youSlot === game?.turn && !game?.finished,
      // Online there is no mid-game restart — a shared board is not one player's
      // to wipe — so this is purely the rematch, and a spectator gets neither.
      canReset: youSlot !== null && Boolean(game?.finished),
      showInitials,
      setShowInitials,
      online: {
        // Left or dropped, so the bar can explain a board that has stopped
        // moving. Mid-game the seat is never deleted — it has to stay for the
        // turn order to make sense — so this is the only way the other player
        // finds out. `absenceOf` reads the two flags; nothing here tests them.
        absence: absenceOf(opponentSeat),
        code,
        connected,
        hint,
        notice,
        opponent: opponentName,
        spectating,
        // `Game` reads exactly this off `online`, and closes the board when it
        // is not the seat on the clock.
        youSlot,
      },
    }),
    [
      cast,
      code,
      connected,
      dispatch,
      game,
      hint,
      notice,
      opponentName,
      opponentSeat,
      showInitials,
      spectating,
      youSlot,
    ]
  );

  // 410 is terminal and reads differently depending on whether we ever got in:
  // a room we were playing in has died, a room we never reached never existed.
  if (error?.code === "gone") {
    return (
      <Panel>
        <PanelHeading>Connection lost</PanelHeading>
        <PanelText>
          {room
            ? "This room is gone — a game closes after an hour without a move. Create a new game to play again."
            : `Nothing is waiting on ${code}. Check the code, or create a new game to play again.`}
        </PanelText>
        <PanelActions>
          <Button onClick={onLeave} type="button">
            Back to the menu
          </Button>
        </PanelActions>
      </Panel>
    );
  }

  // No snapshot yet. An `error` here is the handshake failing rather than the
  // room being dead, so the hook is still retrying behind this screen.
  if (!room) {
    return (
      <Panel>
        <PanelHeading>
          {error ? "Can’t reach the game" : "Connecting…"}
        </PanelHeading>
        {error && <PanelText>{error.message}</PanelText>}
        <PanelActions>
          <Button onClick={onLeave} type="button">
            Back to the menu
          </Button>
        </PanelActions>
      </Panel>
    );
  }

  if (status === "lobby") {
    return (
      <Panel>
        <PanelHeading>Waiting for a second player</PanelHeading>
        <PanelText>
          Read this code out, or send the link. The game starts the moment
          somebody joins.
        </PanelText>
        <RoomCode code={code} />
        <PanelActions>
          <Button onClick={quit} type="button">
            Cancel
          </Button>
        </PanelActions>
      </Panel>
    );
  }

  return (
    <Context.Provider value={store}>
      <Game banner={<OnlineBar onLeave={quit} />} />
    </Context.Provider>
  );
};

export default OnlineGame;
