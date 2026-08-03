"use client";

import { useCallback, useEffect, useState } from "react";

import { isValidCode, normalizeCode } from "@/lib/realtime/codes";

import Game from "./Game";
import { Lobby } from "./Lobby";
import { ContextProvider } from "./context";
import { OnlineGame } from "./online";

// Three screens, one page.
//
//   null     the mode picker
//   "local"  the hotseat game, byte for byte what it has always been — its own
//            useReducer, no room, no hook, no request. The realtime core is not
//            in this branch at all.
//   "online" the same board driven by a room.
//
// Which one is showing is client state rather than a route: the board is not
// something you want to navigate back into by accident, and the local game has
// never had a URL of its own.

export const TicTacOverflow = () => {
  const [mode, setMode] = useState(null);
  const [code, setCode] = useState(null);

  // A shared link (?room=K7F2) drops straight into that room. Read after mount
  // rather than during render: this page is prerendered, so the first client
  // render has to match the server's markup.
  useEffect(() => {
    const shared = normalizeCode(
      new URLSearchParams(window.location.search).get("room") ?? "",
    );
    if (isValidCode(shared)) {
      setCode(shared);
      setMode("online");
    }
  }, []);

  const play = useCallback((joined) => {
    setCode(joined);
    setMode("online");
  }, []);

  const leave = useCallback(() => {
    setMode(null);
    setCode(null);
    // Drop ?room= as well, or "back to the menu" would bounce straight back in
    // on the next reload.
    window.history.replaceState(null, "", window.location.pathname);
  }, []);

  if (mode === "local") {
    return (
      <ContextProvider>
        <Game />
      </ContextProvider>
    );
  }

  if (mode === "online" && code) {
    return <OnlineGame code={code} onLeave={leave} />;
  }

  return <Lobby onOnline={play} onSameDevice={() => setMode("local")} />;
};

export default TicTacOverflow;
