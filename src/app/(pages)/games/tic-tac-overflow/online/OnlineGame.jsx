"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { absenceOf } from "@/lib/realtime/absence";
import { useRoom } from "@/lib/realtime/useRoom";

import Game from "../Game";
import {
  Button,
  Panel,
  PanelActions,
  PanelHeading,
  PanelText,
  RoomCode,
} from "../components";
import { Context, EXPIRY_PREVIEW_KEY } from "../context";
import { TTO_GAME_ID, markForSlot } from "../multiplayer";
import { OnlineBar } from "./OnlineBar";

/**
 * Online Tic-Tac-Overflow: the same board, driven by a realtime room.
 *
 * This component's whole job is to fill the game's context from `useRoom`
 * instead of from a `useReducer`. Cell, Status, Toolbar and Play Again do not
 * know the difference, which is the point — there is one board in this
 * codebase, not two.
 */
export const OnlineGame = ({ code, onLeave }) => {
  const {
    connected,
    error,
    leave,
    me,
    players,
    room,
    send,
    spectating,
    state: board,
    status,
  } = useRoom({ code, game: TTO_GAME_ID });

  // The hint is a display preference and stays exactly that: local, per player,
  // in localStorage. It is deliberately NOT in the room's state — both players
  // set it independently, and the rule it previews runs on the server whether
  // or not anybody is looking at it.
  const [showExpiring, setShowExpiring] = useState(true);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem(EXPIRY_PREVIEW_KEY);
    if (saved !== null) {
      setShowExpiring(saved === "true");
    }
  }, []);

  const mark = me ? markForSlot(me.slot) : null;
  const opponent = players.find((player) => player.slot !== me?.slot) ?? null;

  // Walking away is not the same as navigating away. Giving the seat up first
  // is what turns "the board just stopped" into a sentence on the other
  // player's screen; without it they wait out the presence timeout for news
  // that was available the instant this button was pressed.
  const quit = useCallback(async () => {
    await leave();
    onLeave();
  }, [leave, onLeave]);

  const place = useCallback(
    async (cell) => {
      let result = await send({ type: "PLACE MARK", cell }, { optimistic: true });

      // 409 means the opponent's move landed between the render we tapped and
      // the request we sent. `send` has already applied the board we missed, so
      // the same tap is worth exactly one more try against it — and only one,
      // because a second failure means the cell really is contested.
      if (!result.ok && result.error === "stale-revision") {
        result = await send({ type: "PLACE MARK", cell }, { optimistic: true });
      }

      setNotice(result.ok ? null : result.message ?? null);
    },
    [send],
  );

  const rematch = useCallback(async () => {
    const result = await send({ type: "PLAY AGAIN" });
    // Both players may reach for it at once. Losing that race is not something
    // to put on screen — the new board is already on its way.
    const raced = result.error === "stale-revision" || result.error === "rejected";
    setNotice(result.ok || raced ? null : result.message ?? null);
  }, [send]);

  // The hotseat game's action creators, answered over the wire. Same actions in,
  // same board out; only the authority moved.
  const dispatch = useCallback(
    (action) => {
      switch (action.type) {
        case "PLACE MARK":
          place(action.cell);
          break;
        case "PLAY AGAIN":
          rematch();
          break;
        case "SET EXPIRY PREVIEW":
          setShowExpiring(action.enabled);
          break;
        default:
          break;
      }
    },
    [place, rematch],
  );

  const store = useMemo(() => {
    const state = board ? { ...board, showExpiring } : null;
    return {
      state,
      dispatch,
      // The token is what actually authorizes a move; this only stops the board
      // offering one the server would refuse.
      canPlay: mark !== null && state?.winner === null && state?.turn === mark,
      // Online there is no "reset" — a shared board is not one player's to
      // wipe. There is only a rematch, and only once somebody has won.
      canReset: mark !== null && Boolean(state) && state.winner !== null,
      online: {
        // Left or dropped, so the bar can explain a board that has stopped
        // moving. Mid-game the seat is never deleted — it has to stay for the
        // turn order to make sense — so this is the only way the other player
        // finds out.
        absence: absenceOf(opponent),
        code,
        connected,
        mark,
        notice,
        opponent: opponent?.name ?? "your opponent",
        spectating,
      },
    };
  }, [
    board,
    code,
    connected,
    dispatch,
    mark,
    notice,
    opponent,
    showExpiring,
    spectating,
  ]);

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
        <PanelHeading>{error ? "Can’t reach the game" : "Connecting…"}</PanelHeading>
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
