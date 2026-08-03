"use client";

import { useCallback, useMemo, useState } from "react";

import { useRoom } from "@/lib/realtime/useRoom";

import Game from "../Game";
import {
  Button,
  Panel,
  PanelActions,
  PanelHeading,
  PanelText,
} from "../components";
import { Context, DRAW_EDGE, NEW_GAME } from "../context";
import {
  drawEdgeAction,
  EDGE_CASE_GAME_ID,
  playAgain,
} from "../multiplayer";
import { createPlayers, playerFor } from "../players";
import { sendRetrying } from "./actions";
import { OnlineBar } from "./OnlineBar";
import { RoomLobby } from "./RoomLobby";
import { Spectator } from "./Spectator";

/**
 * Edge Case in a room.
 *
 * This component's whole job is to fill the game's context from `useRoom`
 * instead of from a `useReducer`. Board, Scoreboard, TurnBanner, Announcer and
 * Endgame do not know the difference — there is one board in this codebase, not
 * two, and the hotseat game on the same page still runs with no network at all.
 *
 * Three screens come out of one room:
 *
 *   spectating       the television (`Spectator`) — no seat, no controls
 *   status "lobby"   names, colours, and the host's Start button
 *   otherwise        the board, with `interactive` gated on whose turn it is
 */
export const OnlineGame = ({ code, name, onLeave, spectate = false }) => {
  const {
    connected,
    error,
    me,
    players,
    refresh,
    room,
    send,
    spectating,
    state,
    status,
  } = useRoom({ code, game: EDGE_CASE_GAME_ID, name, spectate });

  const [notice, setNotice] = useState(null);

  const game = state?.game ?? null;

  // The room's seats become the board's cast: join order, real names, chosen
  // colours. Join order is `room.players` — an array, so the database preserves
  // it — and it is the same order the engine's `state.slots` was built from.
  const cast = useMemo(
    () =>
      createPlayers(
        players.map((player) => player.slot),
        {
          names: players.map((player) => player.name),
          colors: players.map((player) => player.color),
        }
      ),
    [players]
  );

  const draw = useCallback(
    async (edge) => {
      const result = await sendRetrying(send, drawEdgeAction(edge), {
        optimistic: true,
      });
      setNotice(result.ok ? null : result.message ?? null);
    },
    [send]
  );

  const rematch = useCallback(async () => {
    const result = await sendRetrying(send, playAgain());
    // Everyone may reach for it at once. Losing that race is not something to
    // put on screen — the new board is already on its way.
    const raced = result.error === "stale-revision" || result.error === "rejected";
    setNotice(result.ok || raced ? null : result.message ?? null);
  }, [send]);

  // The hotseat game's action creators, answered over the wire. Same actions in,
  // same board out; only the authority moved.
  const dispatch = useCallback(
    (action) => {
      switch (action.type) {
        case DRAW_EDGE:
          draw(action.edge);
          break;
        case NEW_GAME:
          rematch();
          break;
        default:
          // SET SETUP OPEN and friends are hotseat-only: size and player count
          // are the host's, decided in the lobby, and not one player's to
          // change out from under a shared board.
          break;
      }
    },
    [draw, rematch]
  );

  const store = useMemo(() => {
    const you = playerFor(cast, me?.slot);

    return {
      state: game
        ? {
            game,
            players: cast,
            size: state.size,
            playerCount: cast.length,
            setupOpen: false,
          }
        : null,
      dispatch,
      online: {
        code,
        connected,
        notice,
        // The seat this browser holds. `Game` reads it for `youSlot`, and it is
        // resolved by the server from the token — never claimed by the client.
        youSlot: me?.slot ?? null,
        you,
        seated: Boolean(me),
      },
    };
  }, [cast, code, connected, dispatch, game, me, notice, state]);

  // 410 is terminal, and it reads differently depending on whether we ever got
  // in: a room we were playing in has died, a room we never reached never was.
  if (error?.code === "gone") {
    return (
      <Panel>
        <PanelHeading>Connection lost</PanelHeading>
        <PanelText>
          {room
            ? "Connection lost — create a new game to play again. A room closes after an hour without a move."
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

  // Watching, either on purpose or because the room was full when we knocked.
  if (spectating || !me) {
    return <Spectator code={code} players={players} state={state} />;
  }

  if (status === "lobby") {
    return (
      <RoomLobby
        code={code}
        connected={connected}
        me={me}
        onLeave={onLeave}
        players={players}
        refresh={refresh}
        send={send}
        size={state.size}
      />
    );
  }

  return (
    <Context.Provider value={store}>
      <Game banner={<OnlineBar onLeave={onLeave} />} />
    </Context.Provider>
  );
};

export default OnlineGame;
