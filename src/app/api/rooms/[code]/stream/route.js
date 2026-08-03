import { STREAM_HEARTBEAT_MS } from "@/lib/realtime/constants";
import { toResponse } from "@/lib/realtime/errors";
import { clientIp, limitOr429 } from "@/lib/realtime/http";
import { getRoom, subscribeRoom } from "@/lib/realtime/rooms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Opening streams, not messages on them. A client that reconnects faster than
// this is in a loop, and cutting it off is the kindest thing for both of us.
const RATE_LIMIT = 60;

const encoder = new TextEncoder();

/**
 * GET /api/rooms/[code]/stream?token=... — server-sent events.
 *
 * Events:
 *   sync  — a full room payload (also sent immediately on connect)
 *   gone  — the room expired or was deleted; the stream closes after this
 *   `:` comment lines are heartbeats, invisible to EventSource
 *
 * The token is optional (spectators have none) and only decides who `me` is in
 * each payload. It rides in the query string because EventSource cannot set
 * headers — worth knowing, since that means room tokens can appear in proxy
 * access logs.
 */
export async function GET(request, { params }) {
  const { code } = await params;

  const limited = limitOr429(`rooms-stream:${clientIp(request)}`, RATE_LIMIT);
  if (limited) return limited;

  const token = new URL(request.url).searchParams.get("token") || undefined;

  // Resolve the first snapshot before opening the stream: a dead room should be
  // an honest 410 the client can act on, not a stream that opens and hangs up.
  let initial;
  try {
    initial = await getRoom(code, token);
  } catch (err) {
    return toResponse(err);
  }

  let heartbeat = null;
  let unsubscribe = null;
  let closed = false;

  // Idempotent, and called from three places (abort, cancel, write failure) —
  // one missed call leaks a heartbeat interval and a room poll subscription for
  // the lifetime of a process that only restarts on deploy.
  const cleanup = () => {
    if (closed) return;
    closed = true;
    if (heartbeat) clearInterval(heartbeat);
    heartbeat = null;
    if (unsubscribe) unsubscribe();
    unsubscribe = null;
  };

  const stream = new ReadableStream({
    start(controller) {
      const write = (chunk) => {
        if (closed) return false;
        try {
          controller.enqueue(encoder.encode(chunk));
          return true;
        } catch {
          // The peer went away between our checks. Nothing to report.
          cleanup();
          return false;
        }
      };

      const send = (event, data) =>
        write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

      send("sync", initial);

      // `initial.code` rather than the path segment: it is the row's own
      // primary key, so "k7f2" and "K7F2" share one poll loop instead of
      // opening two for the same board.
      unsubscribe = subscribeRoom(
        initial.code,
        token,
        (msg) => {
          if (msg.type === "gone") {
            send("gone", { error: "gone" });
            cleanup();
            try {
              controller.close();
            } catch {
              // already closed
            }
            return;
          }
          send("sync", msg.room);
        },
        // We just sent this revision; don't send it again on the first poll.
        initial.revision,
      );

      heartbeat = setInterval(() => write(": ping\n\n"), STREAM_HEARTBEAT_MS);
      heartbeat.unref?.();

      // Fires when the client disconnects without cancelling the reader —
      // the common case for a closed tab.
      request.signal?.addEventListener("abort", () => {
        cleanup();
        try {
          controller.close();
        } catch {
          // already closed
        }
      });
    },

    // Fires when the consumer cancels the reader.
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      // `no-transform` matters as much as `no-cache`: a proxy that "helpfully"
      // gzips the stream will buffer it into uselessness.
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Without this nginx buffers the response and the stream appears dead
      // until it happens to flush. Non-negotiable behind the site's proxy.
      "X-Accel-Buffering": "no",
    },
  });
}
