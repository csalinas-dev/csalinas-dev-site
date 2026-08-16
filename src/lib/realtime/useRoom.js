"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  PLAYER_TOKEN_KEY,
  POLL_FALLBACK_MS,
  SSE_FAILURES_BEFORE_POLLING,
  SSE_RETRY_BASE_MS,
  SSE_RETRY_MAX_MS,
} from "./constants";
import { keepSeat } from "./identity";
import { lookupGame } from "./registry";

// Client half of the room contract. One hook per screen; it owns the transport
// (SSE, falling back to polling) and hands back the latest authoritative
// snapshot plus a `send` that speaks the revision protocol.

// Last resort, when neither localStorage nor cookies will take a write. Scoped
// to the module, so it does not survive a navigation — see the note below.
let ephemeralToken = null;

// A year. The identity is worth keeping precisely as long as somebody might
// come back to a game, and re-minting it costs them their seat.
const TOKEN_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function readCookieToken() {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${PLAYER_TOKEN_KEY}=([^;]+)`)
  );
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookieToken(token) {
  if (typeof document === "undefined") return;
  try {
    document.cookie = `${PLAYER_TOKEN_KEY}=${encodeURIComponent(token)}; path=/; max-age=${TOKEN_COOKIE_MAX_AGE}; SameSite=Lax`;
  } catch {
    // Nothing else to try; the caller still has a usable token for this page.
  }
}

/**
 * The browser's player identity: one UUID, minted once, shared by every game on
 * the site. It is the authorization for moves, so it is never rendered and
 * never sent anywhere but this site's own API.
 *
 * Written to BOTH localStorage and a cookie, and read from either. That
 * redundancy is the whole point: when localStorage is unavailable — private
 * browsing, storage blocked, some embedded webviews — the old fallback minted a
 * fresh UUID per page load, because it lived in a module that reloads on
 * navigation. Refreshing or re-opening an invite link therefore made you a
 * *different* player and left your old seat stranded in the room, which is
 * exactly the duplicate-player bug in #105. A cookie survives navigation in all
 * those cases, so identity now does too.
 *
 * Not HttpOnly: the client has to read it. That is no weaker than the
 * localStorage it replaces, and the token only ever authorizes moves in a room
 * that deletes itself within the hour.
 */
export function getPlayerToken() {
  if (typeof window === "undefined") return null;

  let stored = null;
  try {
    stored = window.localStorage.getItem(PLAYER_TOKEN_KEY);
  } catch {
    // Storage is blocked. The cookie below is the fallback.
  }

  const token = stored || readCookieToken() || ephemeralToken || crypto.randomUUID();

  // Re-assert on every read so a half-available browser heals itself: if only
  // one of the two stores works, the next load still finds the same identity.
  try {
    window.localStorage.setItem(PLAYER_TOKEN_KEY, token);
  } catch {
    // Expected when storage is blocked.
  }
  writeCookieToken(token);

  // Only meaningful if both writes failed; harmless otherwise.
  ephemeralToken = token;

  return token;
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

/** Exponential backoff, capped. Shared by the two paths that retry a stream. */
const retryDelay = (failures) =>
  Math.min(SSE_RETRY_BASE_MS * 2 ** (failures - 1), SSE_RETRY_MAX_MS);

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

  // The seat this browser was last told it holds — the whole seat object, not
  // its slot, because slots are recycled and `connectedAt` is what tells our
  // seat apart from the next player to sit in it. A payload that does not know
  // who we are must not be able to take it away — see identity.js.
  const seatRef = useRef(null);

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

    // Every payload of every game funnels through here — SSE `sync`, a polling
    // tick, an action's 409/422 body, join, leave, refresh — so repairing the
    // identity once here covers all of them.
    const merged = keepSeat(next, seatRef.current);

    // Clearing the ref when the merged payload really has no seat is what lets
    // a lobby "leave" and a host removal still land: the seat is gone from
    // `players` (or a different seat now wears its number), so `keepSeat`
    // declines to restore it and we stop holding on.
    seatRef.current = merged.me ?? null;

    roomRef.current = merged;
    confirmedRef.current = merged;
    setRoom(merged);
  }, []);

  // The token rides in a header, never the query string — this is also the
  // polling fallback, so a query parameter would write a credential into the
  // proxy access log every couple of seconds.
  const readRoom = useCallback(() => {
    const token = tokenRef.current;
    return api(`/api/rooms/${encodeURIComponent(code)}`, {
      headers: token ? { "X-Player-Token": token } : undefined,
    });
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
      const res = await readRoom();
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

    const openStream = async () => {
      if (cancelled) return;

      // EventSource cannot set headers, so whatever identifies this stream ends
      // up in the URL and therefore in access logs. Swap the long-lived token
      // for a single-use ticket that expires in seconds; the token itself stays
      // in this POST body. Spectators have no token and open the stream bare.
      let query = "";
      if (token) {
        const res = await api(
          `/api/rooms/${encodeURIComponent(code)}/ticket`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
          },
        );
        if (cancelled) return;

        if (res.status === 410) {
          roomIsGone();
          return;
        }

        if (res.ok && res.body?.ticket) {
          query = `?ticket=${encodeURIComponent(res.body.ticket)}`;
        } else {
          // No ticket, no identity — the stream would open as a spectator and
          // the player would silently lose their seat in the UI. Treat it as a
          // connection failure so the existing retry/backoff owns it.
          failures += 1;
          setConnected(false);
          if (failures >= SSE_FAILURES_BEFORE_POLLING) {
            startPolling();
          } else {
            retryTimer = setTimeout(openStream, retryDelay(failures));
          }
          return;
        }
      }

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

        retryTimer = setTimeout(openStream, retryDelay(failures));
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
  }, [code, game, spectate, applyRoom, readRoom]);

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
    const res = await readRoom();
    if (res.status === 410) {
      setError({
        code: "gone",
        message: "Connection lost — create a new game to play again.",
      });
      return;
    }
    if (res.ok) applyRoom(res.body?.room);
  }, [code, readRoom, applyRoom]);

  /**
   * Give up this browser's seat, or — as host, in the lobby — remove another
   * player by slot. Bumping the revision is what tells everyone else.
   */
  const leave = useCallback(
    async (slot) => {
      if (!code) return { ok: false };
      const token = tokenRef.current;
      if (!token) return { ok: false };

      const res = await api(`/api/rooms/${encodeURIComponent(code)}/leave`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(slot === undefined ? { token } : { token, slot }),
      });

      if (res.ok) applyRoom(res.body?.room);
      return {
        ok: res.ok,
        error: res.body?.error,
        message: res.body?.message,
      };
    },
    [code, applyRoom],
  );

  // Best effort when the tab goes away: `sendBeacon` survives unload where
  // fetch does not. If it fails, presence expiry covers it a little later —
  // this only makes the news arrive sooner.
  useEffect(() => {
    if (!code || spectate) return undefined;

    const announce = () => {
      const token = tokenRef.current;
      if (!token || typeof navigator?.sendBeacon !== "function") return;
      try {
        navigator.sendBeacon(
          `/api/rooms/${encodeURIComponent(code)}/leave`,
          new Blob([JSON.stringify({ token })], { type: "application/json" }),
        );
      } catch {
        // Unload is not the place to care.
      }
    };

    // `pagehide` rather than `unload`: it fires on mobile Safari and survives
    // the back/forward cache, where `unload` is simply never called.
    window.addEventListener("pagehide", announce);
    return () => window.removeEventListener("pagehide", announce);
  }, [code, spectate]);

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
    leave,
  };
}

export default useRoom;
