import { randomUUID } from "node:crypto";

// Short-lived, single-use credentials for opening an SSE stream.
//
// WHY THIS EXISTS: `EventSource` cannot set request headers, so the only way to
// identify a stream is the URL. Putting the long-lived player token there means
// a credential that authorizes moves ends up in reverse-proxy access logs,
// browser history, and anything else that records URLs. A ticket goes in the
// URL instead: it is minted by an authenticated POST, dies on first use or
// within seconds, and is useless to anyone who reads it out of a log later.
//
// In memory rather than in the database on purpose. A ticket outlives its
// request by seconds, so a container restart losing them costs a client one
// reconnect — which the stream already handles — and the alternative is a write
// and a delete per stream open.

const TICKET_TTL_MS = 30_000;

// Cheap insurance against a client that mints tickets it never redeems.
const MAX_TICKETS = 10_000;

/** @type {Map<string, { code: string, token: string, expiresAt: number }>} */
const tickets = new Map();

function sweep(now) {
  for (const [ticket, entry] of tickets) {
    if (entry.expiresAt <= now) tickets.delete(ticket);
  }
}

/**
 * Mint a ticket standing in for `token` on `code`.
 *
 * @param {String} code - The room the ticket is valid for
 * @param {String} token - The player token it stands in for
 * @returns {String} The ticket
 */
export function issueTicket(code, token) {
  const now = Date.now();
  sweep(now);

  // Map iteration is insertion-ordered, so this drops the oldest first.
  while (tickets.size >= MAX_TICKETS) {
    const oldest = tickets.keys().next();
    if (oldest.done) break;
    tickets.delete(oldest.value);
  }

  const ticket = randomUUID();
  tickets.set(ticket, { code, token, expiresAt: now + TICKET_TTL_MS });
  return ticket;
}

/**
 * Redeem a ticket. Single use — a redeemed ticket is gone, so replaying one
 * captured from a log buys nothing.
 *
 * @param {String} ticket
 * @param {String} code - The room being opened; a ticket is bound to one room
 * @returns {String|null} The player token, or null if the ticket is unusable
 */
export function redeemTicket(ticket, code) {
  if (!ticket) return null;

  const entry = tickets.get(ticket);
  if (!entry) return null;

  tickets.delete(ticket);

  if (entry.expiresAt <= Date.now()) return null;
  // Codes are case-insensitive everywhere else, so they are here too.
  if (entry.code.toUpperCase() !== String(code).toUpperCase()) return null;

  return entry.token;
}

/** Test seam. */
export const _size = () => tickets.size;
