"use client";

import { useCallback, useMemo, useState } from "react";

import { absenceOf } from "@/lib/realtime/absence";
import { useRoom } from "@/lib/realtime/useRoom";

import Game from "../Game";
import {
  Button,
  Panel,
  PanelActions,
  PanelHeading,
  PanelText,
} from "../components";
import { DROP_PIECE, NEW_GAME } from "../context/actions";
import { Context } from "../context";
import { C404_GAME_ID, SEATS } from "../multiplayer";
import { createPlayers } from "../players";
import { OnlineBar } from "./OnlineBar";
import { RoomCode } from "./RoomCode";

/**
 * Online Connect 404: the same board, driven by a realtime room.
 *
 * This component's whole job is to fill the game's context from `useRoom`
 * instead of from a `useReducer`. The board, the turn banner and the endgame
 * panel do not know the difference, which is the point — there is one board in
 * this codebase, not two.
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
  } = useRoom({ code, game: C404_GAME_ID });

  const [notice, setNotice] = useState(null);

  // The seat this browser holds, resolved by the server from its token. Null for
  // a spectator, which is what closes the board to them.
  const youSlot = me?.slot ?? null;
  // Null for a spectator on purpose: they are not playing anybody, and picking
  // one of the two seats arbitrarily would put "so-and-so left the game" on a
  // screen that has no stake in it.
  const opponent =
    youSlot === null
      ? null
      : (seats.find((seat) => seat.slot !== youSlot) ?? null);

  // Walking away is not the same as navigating away. Giving the seat up first
  // is what turns "the board just stopped" into a sentence on the other
  // player's screen; without it they wait out the presence timeout for news
  // that was available the instant this button was pressed.
  const quit = useCallback(async () => {
    await leave();
    onLeave();
  }, [leave, onLeave]);

  // A drop goes over the wire without the slot the hotseat action carries: the
  // server resolves who moved from the request's token, and a slot in a body is
  // a slot somebody can lie about. Everything else about the move — a full
  // column, whose turn it is, whether four are in a row — is the engine's, and
  // it is the same engine at both ends.
  const drop = useCallback(
    async (col) => {
      const action = { type: DROP_PIECE, col };
      let result = await send(action, { optimistic: true });

      // 409 means the opponent's drop landed between the render we tapped and
      // the request we sent. `send` has already applied the board we missed, so
      // the same tap is worth exactly one more try against it — and only one,
      // because a second failure means the column really is contested.
      if (!result.ok && result.error === "stale-revision") {
        result = await send(action, { optimistic: true });
      }

      setNotice(result.ok ? null : (result.message ?? null));
    },
    [send],
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
        case DROP_PIECE:
          drop(action.col);
          break;
        case NEW_GAME:
          rematch();
          break;
        default:
          break;
      }
    },
    [drop, rematch],
  );

  // The board's cast, built by the same function the hotseat game uses so the
  // colours, initials and fallbacks are identical in both modes. Names are
  // positional against SEATS, never against the room's roster — a player who has
  // left keeps their seat and their place in this list, and a room in the lobby
  // has a hole in it.
  const cast = useMemo(
    () =>
      createPlayers([...SEATS], {
        names: SEATS.map(
          (slot) => seats.find((seat) => seat.slot === slot)?.name,
        ),
      }),
    [seats],
  );

  const store = useMemo(
    () => ({
      state: { game, players: cast },
      dispatch,
      online: {
        // Left or dropped, so the bar can explain a board that has stopped
        // moving. Mid-game the seat is never deleted — it has to stay for the
        // turn order to make sense — so this is the only way the other player
        // finds out.
        absence: absenceOf(opponent),
        code,
        connected,
        notice,
        opponent: opponent?.name ?? "your opponent",
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
      notice,
      opponent,
      spectating,
      youSlot,
    ],
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
