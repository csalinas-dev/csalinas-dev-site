import { STREAM_POLL_MS } from "./constants";

// There is no broker and no custom server, so "realtime" is a poll — but a poll
// per *room*, not per connection. Four players and a TV watching the same board
// share one 1s query; without this the same board would be read five times a
// second for no new information.
//
// The refcount is the whole point: the interval is created when a room gains
// its first listener and cleared when it loses its last. A leaked interval per
// disconnect would pile up silently in a process that never restarts between
// deploys.

export function createRoomWatcher({ poll, intervalMs = STREAM_POLL_MS } = {}) {
  const rooms = new Map(); // code -> { timer, listeners: Map<fn, lastRevision>, busy }

  function tick(code) {
    const entry = rooms.get(code);
    if (!entry || entry.busy) return; // a slow query must not stack up behind itself
    entry.busy = true;

    Promise.resolve()
      .then(() => poll(code))
      .then((row) => {
        // The room may have lost its last listener while the query was in flight.
        if (rooms.get(code) !== entry) return;

        if (!row) {
          // Expired or deleted. Tell everyone once; each will unsubscribe itself.
          for (const listener of [...entry.listeners.keys()]) {
            listener({ type: "gone" });
          }
          return;
        }

        for (const [listener, seen] of [...entry.listeners.entries()]) {
          if (seen === row.revision) continue;
          entry.listeners.set(listener, row.revision);
          listener({ type: "change", row });
        }
      })
      .catch((err) => {
        // A transient database hiccup should not kill live games; the next tick
        // will pick things up. Anything permanent shows up as a heartbeat-only
        // stream, which the client's own timeouts eventually notice.
        console.error("[realtime] watch poll failed", code, err?.message);
      })
      .finally(() => {
        entry.busy = false;
      });
  }

  /**
   * @param {string} code
   * @param {(msg: { type: "change", row: object } | { type: "gone" }) => void} listener
   * @param {number|null} since revision the caller has already rendered; it will
   *   not be told about that revision again.
   * @returns {() => void} unsubscribe — idempotent, safe to call from an abort handler.
   */
  function subscribe(code, listener, since = null) {
    let entry = rooms.get(code);
    if (!entry) {
      entry = { timer: null, listeners: new Map(), busy: false };
      rooms.set(code, entry);
      entry.timer = setInterval(() => tick(code), intervalMs);
      // Never hold the process open for a poll loop.
      entry.timer.unref?.();
    }
    entry.listeners.set(listener, since);

    let released = false;
    return () => {
      if (released) return;
      released = true;
      entry.listeners.delete(listener);
      if (entry.listeners.size === 0 && rooms.get(code) === entry) {
        clearInterval(entry.timer);
        rooms.delete(code);
      }
    };
  }

  return {
    subscribe,
    /** Rooms currently being polled — i.e. live intervals. Used by the tests. */
    size: () => rooms.size,
    listeners: (code) => rooms.get(code)?.listeners.size ?? 0,
  };
}
