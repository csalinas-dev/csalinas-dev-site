import { CODE_ALPHABET, CODE_LENGTH } from "./constants";

// Room codes. Isomorphic on purpose — the server mints them, and a join form
// wants `normalizeCode` to clean up what somebody typed off a TV screen.

// Largest multiple of the alphabet size that fits in a byte. Bytes at or above
// it are thrown away rather than folded with `%`, which would make the first
// few characters of the alphabet slightly likelier than the rest.
const REJECT_ABOVE = Math.floor(256 / CODE_ALPHABET.length) * CODE_ALPHABET.length;

/** A fresh, uniformly random room code. Uniqueness is the database's job. */
export function generateCode() {
  let code = "";
  const buf = new Uint8Array(CODE_LENGTH * 2);
  while (code.length < CODE_LENGTH) {
    crypto.getRandomValues(buf);
    for (const byte of buf) {
      if (byte >= REJECT_ABOVE) continue;
      code += CODE_ALPHABET[byte % CODE_ALPHABET.length];
      if (code.length === CODE_LENGTH) break;
    }
  }
  return code;
}

/**
 * Coerce user input into the canonical form: upper case, whitespace and
 * punctuation dropped. Characters outside the alphabet survive so that
 * `isValidCode` can reject them — silently deleting a typo'd "O" would turn a
 * wrong code into a differently wrong one with no explanation.
 */
export function normalizeCode(input) {
  if (typeof input !== "string") return "";
  return input.trim().toUpperCase().replace(/[\s-]/g, "");
}

export function isValidCode(code) {
  if (typeof code !== "string" || code.length !== CODE_LENGTH) return false;
  return [...code].every((ch) => CODE_ALPHABET.includes(ch));
}
