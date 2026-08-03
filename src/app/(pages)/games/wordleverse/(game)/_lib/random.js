import words from "@/data/words.json";

/**
 * Size of the answer pool for dates before {@link EXPANSION_SEED}.
 *
 * The daily answer is picked as `words[floor(random(seed) * poolSize)]`, so the
 * pool size — not just the contents — decides which word a date maps to.
 * Growing `words.json` would therefore rewrite the answer for every date ever
 * played, including past dates, which stay replayable via
 * `/games/wordleverse?date=YYYY-MM-DD`. Pinning older dates to the original
 * 2319-word prefix keeps every historical answer exactly where it was.
 *
 * Words added after that prefix are still accepted as guesses immediately
 * (`submitGuess` validates against the whole list) and can still come up in
 * "play again" — they just aren't reachable as a *daily* answer until the
 * expansion date.
 *
 * Adding more words later: append them to the end of `words.json`, then bump
 * this count to the current length and set a new future expansion date. Never
 * insert or reorder — that breaks the prefix and every date with it.
 * @type {number}
 */
const ORIGINAL_POOL_SIZE = 2319;

/**
 * Date seed (yyyymmdd, see {@link getDateSeed}) on which the full word list
 * becomes eligible for the daily answer. Must be far enough ahead of the
 * deploy that no date is played under the old pool and re-derived under the
 * new one.
 * @type {number}
 */
const EXPANSION_SEED = 20260901;

/**
 * Generates a seed based on a date
 * @param {Date|string} date - Date object or string in format 'yyyy-mm-dd'
 * @returns {number} - Seed value
 */
export const getDateSeed = (date) => {
  // If date is a string, convert it to a Date object
  const dateObj = typeof date === "string" ? new Date(date) : date;

  return (
    dateObj.getFullYear() * 10000 +
    (dateObj.getMonth() + 1) * 100 +
    dateObj.getDate()
  );
};

/**
 * Generates a pseudo-random number between 0 and 1 based on a seed
 * @param {number} seed - Seed value
 * @returns {number} - Pseudo-random number between 0 and 1
 */
export const pseudoRandom = (seed) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

/**
 * Gets a random word based on the current date
 * @param {Date|string} date - Date object or string in format 'yyyy-mm-dd'
 * @returns {string} - Random word
 */
export const getRandomWord = (date = new Date()) => {
  const seed = getDateSeed(date);

  // Older dates draw from the original prefix of the list so their answers
  // never shift as words are appended — see ORIGINAL_POOL_SIZE.
  const poolSize = seed < EXPANSION_SEED ? ORIGINAL_POOL_SIZE : words.length;

  const randomIndex = Math.floor(pseudoRandom(seed) * poolSize);
  return words[randomIndex];
};
