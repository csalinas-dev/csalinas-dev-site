"use client";

import { useCallback, useEffect, useState } from "react";

import { isValidCode, normalizeCode } from "@/lib/realtime/codes";

import { ContextProvider } from "./context";
import Game from "./Game";
import { Menu } from "./Menu";
import { OnlineGame, readName } from "./online";

// Four screens, one page.
//
//   null       the menu
//   "local"    the hotseat game, byte for byte what it has always been — its own
//              useReducer, no room, no hook, no request
//   "online"   the same board driven by a room
//   "watch"    that room on a television, with no seat taken
//
// Which one is showing is client state rather than a route: the board is not
// something you want to navigate back into by accident, and the local game has
// never had a URL of its own.

export const EdgeCase = () => {
  const [mode, setMode] = useState(null);
  const [code, setCode] = useState(null);
  const [name, setName] = useState("");

  // A shared link — or a QR scanned off a television — is `?room=K7F2`, and it
  // drops straight into that room. Read after mount rather than during render:
  // this page is prerendered, so the first client render has to match the
  // server's markup.
  useEffect(() => {
    const shared = normalizeCode(
      new URLSearchParams(window.location.search).get("room") ?? ""
    );
    if (isValidCode(shared)) {
      setName(readName());
      setCode(shared);
      setMode("online");
    }
  }, []);

  const play = useCallback((joined, playerName) => {
    setName(playerName ?? "");
    setCode(joined);
    setMode("online");
  }, []);

  const watch = useCallback((joined) => {
    setCode(joined);
    setMode("watch");
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

  if ((mode === "online" || mode === "watch") && code) {
    return (
      <OnlineGame
        code={code}
        name={name || undefined}
        onLeave={leave}
        spectate={mode === "watch"}
      />
    );
  }

  return (
    <Menu
      onPlay={play}
      onSameDevice={() => setMode("local")}
      onSpectate={watch}
    />
  );
};

export default EdgeCase;
