"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
    leave,
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

  // The seat this browser last held, remembered so that losing it can be
  // recognised: a seat that disappears out from under somebody is the host
  // removing them, and they are owed that sentence rather than a silent
  // demotion to the television view.
  const heldSlot = useRef(null);
  useEffect(() => {
    if (me) heldSlot.current = me.slot;
  }, [me]);

  // Standing up looks identical to being removed — the seat vanishes either
  // way — and this is the only thing that can tell them apart, because it is
  // the only thing that knows whose idea it was.
  const leaving = useRef(false);

  // The case this used to defend against on its own — a payload that arrives
  // without an identity (a stream whose ticket did not redeem) reporting
  // `me: null` for a player who is still sitting in the room — is now handled
  // in the core, by `keepSeat` in `@/lib/realtime/identity`. That is the one
  // place that rule lives, and `me` here is already repaired by the time it
  // arrives: it goes null only when the seat is genuinely gone.
  //
  // What is left is the question the core cannot answer, and the reason this
  // stays: `keepSeat` repairs `me`, it never says you were *removed*. Only
  // `heldSlot.current !== null` separates "I had a seat and lost it" from "I
  // never had one", which is what stops a genuine spectator being told they
  // were removed, and only `leaving` knows whose idea it was.
  //
  // The `players.some(...)` half is the restatement of `keepSeat`'s rule, and a
  // coarser one: the core also declines a slot that a newcomer has since taken.
  // Where the two differ this simply does not fire, which is the safe way round
  // — it can only ever make the sentence appear less often, never wrongly. If
  // they ever disagree the core is right, so change it there, not here.
  const removed =
    !me &&
    !leaving.current &&
    heldSlot.current !== null &&
    !players.some((player) => player.slot === heldSlot.current);

  const game = state?.game ?? null;

  // The room's seats become the board's cast: join order, real names, chosen
  // colours. Join order is `room.players` — an array, so the database preserves
  // it — and it is the same order the engine's `state.slots` was built from.
  //
  // Absence rides along on the cast rather than being threaded through `Game`
  // as a second prop: every component that draws a player already holds one of
  // these, and a hotseat cast simply has no such field.
  const cast = useMemo(
    () =>
      createPlayers(
        players.map((player) => player.slot),
        {
          names: players.map((player) => player.name),
          colors: players.map((player) => player.color),
        }
      ).map((player, index) => ({ ...player, absence: absenceOf(players[index]) })),
    [players]
  );

  // Walking away is not the same as navigating away. Giving the seat up first
  // is what turns "the board just stopped" into a sentence on everybody else's
  // screen, instead of a stall they wait out for the presence timeout.
  const quit = useCallback(async () => {
    leaving.current = true;
    await leave();
    onLeave();
  }, [leave, onLeave]);

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

  // The seat we had is gone, and we did not stand up. Only the host can do
  // that, and only in the lobby — so say so, rather than quietly demoting
  // somebody to the television view and letting them work it out.
  if (removed && !spectate && !spectating) {
    return (
      <Panel>
        <PanelHeading>You’re out of this game</PanelHeading>
        <PanelText>
          The host removed you from room {code}. If that was not meant to
          happen, ask them for the code again — nothing stops you rejoining.
        </PanelText>
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
        onLeave={quit}
        onRemove={leave}
        players={players}
        refresh={refresh}
        send={send}
        size={state.size}
      />
    );
  }

  return (
    <Context.Provider value={store}>
      <Game banner={<OnlineBar onLeave={quit} />} />
    </Context.Provider>
  );
};

export default OnlineGame;
