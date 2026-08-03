// The one thing about a player this browser remembers between games: what they
// call themselves. Not in the room (a room is temporary and a name is not) and
// not on the server (there is no account here to attach it to).
//
// Both accessors swallow their errors. Storage can be unavailable — private
// browsing, a locked-down profile — and a game that refuses to start because it
// could not remember a nickname would be an absurd trade.

export const NAME_KEY = "EDGECASE-NAME";

/** @returns {String} The remembered name, or "" when there is not one. */
export const readName = () => {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(NAME_KEY) ?? "";
  } catch {
    return "";
  }
};

export const rememberName = (name) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(NAME_KEY, name);
  } catch {
    // Nothing to do and nothing worth saying.
  }
};
