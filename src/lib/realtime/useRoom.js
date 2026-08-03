"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  PLAYER_TOKEN_KEY,
  POLL_FALLBACK_MS,
  SSE_FAILURES_BEFORE_POLLING,
  SSE_RETRY_BASE_MS,
  SSE_RETRY_MAX_MS,
} from "./constants";
import { lookupGame } from "./registry";

// Client half of the room contract. One hook per screen; it owns the transport
// (SSE, falling back to polling) and hands back the latest authoritative
// snapshot plus a `send` that speaks the revision protocol.

// Used only when localStorage is unavailable (private browsing, storage
// disabled). The game still works; it just cannot survive a refresh.
let ephemeralToken = null;

/**
 * The browser's player identity: one UUID, minted once, shared by every game on
 * the site. It is the authorization for moves, so it is never rendered and
 * never sent anywhere but this site's own API.
 */
export function getPlayerToken() {
  if (typeof window === "undefined") return null;
  try {
    let token = window.localStorage.getItem(PLAYER_TOKEN_KEY);
    if (!token) {
      token = crypto.randomUUID();
      window.localStorage.setItem(PLAYER_TOKEN_KEY, token);
    }
    return token;
  } catch {
    ephemeralToken ??= crypto.randomUUID();
    return ephemeralToken;
  }
}

/** fetch that never throws — a dead network is `{ ok: false, status: 0 }`. */
async function api(path, init) {
  try {
    const res = await fetch(path, init);
    let body = null;
    try {
      body = await res.json();
    } catch {
      // 204, or a proxy's HTML error page
    }
    return { ok: res.ok, status: res.status, body };
  } catch {
    return { ok: false, status: 0, body: null };
  }
}

/**
 * Create a room. Not a hook — a "create game" button calls this, then routes to
 * a screen that runs `useRoom` with the code it got back.
 *
 * @returns {{ ok: true, code: string, slot: number, room: object }
 *          |{ ok: false, error: string, message?: string }}
 */
export async function createRoom({ game, name, color, options } = {}) {
  const res = await api("/api/rooms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ game, token: getPlayerToken(), name, color, options }),
  });

  if (!res.ok) {
    return {
      ok: false,
      error: res.body?.error || "create-failed",
      message: res.body?.message,
    };
  }
  return { ok: true, code: res.body.code, slot: res.body.slot, room: res.body.room };
}

/**
 * @param {object} opts
 * @param {string} opts.code    room code; falsy means "not in a room yet"
 * @param {string} opts.game    registry id, checked against the room's own
 * @param {string} [opts.name]  display name to join with
 * @param {string} [opts.color] preferred colour; taken colours fall back silently
 * @param {boolean} [opts.spectate] watch without taking a seat (TV view)
 *
 * @returns {{
 *   state: any, players: object[], me: object|null, status: string,
 *   revision: number, connected: boolean, error: object|null,
 *   spectating: boolean, transport: string|null, room: object|null,
 *   send: (action: object, opts?: { optimistic?: boolean }) => Promise<object>,
 *   refresh: () => Promise<void>,
 * }}
 */
export function useRoom({ code, game, name, color, spectate = false } = {}) {
  const [room, setRoom] = useState(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  const [spectating, setSpectating] = useState(Boolean(spectate));
  const [transport, setTransport] = useState(null);

  // `roomRef` is what the UI is currently showing (possibly optimistic);
  // `confirmedRef` is the last thing the server actually told us, and is what a
  // rejected optimistic action rolls back to.
  const roomRef = useRef(null);
  const confirmedRef = useRef(null);
  const tokenRef = useRef(null);

  // Join details can change (a player edits their name in the lobby) without
  // wanting to tear down and rebuild the connection.
  const joinOptions = useRef({ name, color });
  joinOptions.current = { name, color };

  const applyRoom = useCallback((next) => {
    if (!next) return;
    const current = roomRef.current;
    // SSE, the polling fallback and an action's own response all race each
    // other. Revision is monotonic, so this is all it takes to never render
    // backwards. Equal revisions are allowed through — that is how an
    // optimistic preview gets rolled back to the confirmed state.
    if (current && next.revision < current.revision) return;
    roomRef.current = next;
    confirmedRef.current = next;
    setRoom(next);
  }, []);

  const snapshotUrl = useCallback(() => {
    const token = tokenRef.current;
    const query = token ? `?token=${encodeURIComponent(token)}` : "";
    return `/api/rooms/${encodeURIComponent(code)}${query}`;
  }, [code]);

  useEffect(() => {
    if (!code) return undefined;

    const token = getPlayerToken();
    tokenRef.current = token;

    let cancelled = false;
    let source = null;
    let pollTimer = null;
    let retryTimer = null;
    let failures = 0;

    const stop = () => {
      if (source) {
        source.close();
        source = null;
      }
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
      if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }
    };

    // 410 is terminal and is a different conversation with the user than a
    // dropped connection: nothing will bring this room back, so we stop
    // spending battery on it and the UI offers a new game instead.
    const roomIsGone = () => {
      stop();
      if (cancelled) return;
      setConnected(false);
      setTransport(null);
      setError({
        code: "gone",
        message: "Connection lost — create a new game to play again.",
      });
    };

    const readSnapshot = async () => {
      const res = await api(snapshotUrl());
      if (cancelled) return null;
      if (res.status === 410) {
        roomIsGone();
        return null;
      }
      return res;
    };

    const startPolling = () => {
      if (pollTimer || cancelled) return;
      setTransport("polling");

      const tick = async () => {
        const res = await readSnapshot();
        if (cancelled || !res) return;
        if (!res.ok) {
          setConnected(false);
          return;
        }
        setConnected(true);
        setError(null);
        applyRoom(res.body?.room);
      };

      tick();
      pollTimer = setInterval(tick, POLL_FALLBACK_MS);
    };

    const openStream = () => {
      if (cancelled) return;
      const query = token ? `?token=${encodeURIComponent(token)}` : "";
      // Held in a local as well as in `source`: closing a stream sets `source`
      // to null, and EventSource still fires one last `error` at the object
      // afterwards. Every handler below therefore checks that it is still the
      // live stream before touching anything.
      const es = new EventSource(
        `/api/rooms/${encodeURIComponent(code)}/stream${query}`,
      );
      source = es;

      es.addEventListener("open", () => {
        if (cancelled || source !== es) return;
        failures = 0;
        setConnected(true);
        setTransport("sse");
        setError(null);
      });

      es.addEventListener("sync", (event) => {
        if (cancelled || source !== es) return;
        try {
          applyRoom(JSON.parse(event.data));
        } catch {
          // A truncated frame is not worth tearing the connection down over.
          return;
        }
        setConnected(true);
      });

      es.addEventListener("gone", roomIsGone);

      es.onerror = () => {
        // `gone` and unmount both close this stream first. Without the identity
        // check the close below would run against a null `source` and throw
        // inside an event handler, right when the UI is trying to explain that
        // the room has expired.
        if (cancelled || source !== es) return;
        setConnected(false);
        // EventSource reconnects on its own, but with no backoff and no way to
        // give up — so we own the retry schedule instead.
        es.close();
        source = null;
        failures += 1;

        if (failures >= SSE_FAILURES_BEFORE_POLLING) {
          // Something between here and the server does not like long-lived
          // responses. Stop guessing and poll; 2s is playable.
          startPolling();
          return;
        }

        const delay = Math.min(
          SSE_RETRY_BASE_MS * 2 ** (failures - 1),
          SSE_RETRY_MAX_MS,
        );
        retryTimer = setTimeout(openStream, delay);
      };
    };

    const bootstrap = async () => {
      let res;

      if (spectate) {
        res = await readSnapshot();
      } else {
        res = await api(`/api/rooms/${encodeURIComponent(code)}/join`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, game, ...joinOptions.current }),
        });
        if (cancelled) return;

        // A full room, or one that has already started, is not a failure — it
        // is the spectator path. #89 wants exactly this on a TV.
        if (
          res.status === 403 &&
          (res.body?.error === "room-full" ||
            res.body?.error === "room-in-progress")
        ) {
          setSpectating(true);
          res = await readSnapshot();
        } else if (res.status === 410) {
          roomIsGone();
          return;
        }
      }

      if (cancelled || !res) return;

      if (!res.ok) {
        setError({
          code: res.body?.error || "connect-failed",
          message: res.body?.message || "Could not reach the game.",
        });
        // Retry only what a retry can fix: a dead network (status 0), a server
        // that fell over, or a rate limit that will lift. A 400 or a 403 is a
        // verdict — `wrong-game` and `bad-token` will say exactly the same
        // thing in two seconds, and asking again forever is a hot loop against
        // our own API with a permanent error already on screen.
        const worthRetrying =
          res.status === 0 || res.status === 429 || res.status >= 500;
        if (worthRetrying) {
          // Transient (offline, restarting container). Try the whole handshake
          // again rather than opening a stream onto a room we never got.
          retryTimer = setTimeout(bootstrap, SSE_RETRY_BASE_MS * 2);
        }
        return;
      }

      setError(null);
      applyRoom(res.body?.room);
      openStream();
    };

    bootstrap();

    return () => {
      cancelled = true;
      stop();
    };
    // `name`/`color` are deliberately absent — they are read through a ref so
    // that editing your name in the lobby does not tear down the connection.
  }, [code, game, spectate, applyRoom, snapshotUrl]);

  /**
   * Send an action. Resolves to `{ ok }` plus, on failure, the server's error
   * code — `stale-revision` (the board moved; the fresh state has already been
   * applied, so the caller may simply try again), `rejected` (the game said no),
   * or `gone`.
   *
   * `optimistic: true` runs the game's own reducer locally first so the board
   * reacts on tap. The preview keeps the current revision, so whatever the
   * server says next overwrites it; a refused action rolls back.
   */
  const send = useCallback(
    async (action, { optimistic = false } = {}) => {
      const current = roomRef.current;
      const token = tokenRef.current;

      if (!current) return { ok: false, error: "not-connected" };
      if (!current.me) return { ok: false, error: "not-a-player" };

      const confirmed = confirmedRef.current;

      if (optimistic) {
        const def = lookupGame(current.game);
        if (def) {
          try {
            const result = def.reducer(
              structuredClone(current.state),
              action,
              current.me,
            );
            if (result && !result.error) {
              const preview = { ...current, state: result.state };
              roomRef.current = preview;
              setRoom(preview);
            }
          } catch {
            // An optimistic render is never worth throwing over; the server's
            // answer is the one that counts anyway.
          }
        }
      }

      const res = await api(
        `/api/rooms/${encodeURIComponent(current.code)}/action`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token,
            game: current.game,
            revision: current.revision,
            action,
          }),
        },
      );

      if (res.status === 410) {
        setError({
          code: "gone",
          message: "Connection lost — create a new game to play again.",
        });
        return { ok: false, error: "gone" };
      }

      // 409 and 422 both carry the authoritative room; applying it is both the
      // rollback of any optimistic preview and the resync the client needs.
      if (res.body?.room) applyRoom(res.body.room);
      else if (optimistic && confirmed) applyRoom(confirmed);

      if (res.ok) return { ok: true, room: res.body?.room ?? null };

      return {
        ok: false,
        error: res.body?.error || "request-failed",
        message: res.body?.message,
        room: res.body?.room ?? null,
      };
    },
    [applyRoom],
  );

  /** Pull a fresh snapshot on demand (tab regained focus, user hit retry). */
  const refresh = useCallback(async () => {
    if (!code) return;
    const res = await api(snapshotUrl());
    if (res.status === 410) {
      setError({
        code: "gone",
        message: "Connection lost — create a new game to play again.",
      });
      return;
    }
    if (res.ok) applyRoom(res.body?.room);
  }, [code, snapshotUrl, applyRoom]);

  return {
    room,
    state: room?.state ?? null,
    players: room?.players ?? [],
    me: room?.me ?? null,
    status: room?.status ?? "lobby",
    revision: room?.revision ?? 0,
    connected,
    error,
    spectating,
    transport,
    send,
    refresh,
  };
}

export default useRoom;
