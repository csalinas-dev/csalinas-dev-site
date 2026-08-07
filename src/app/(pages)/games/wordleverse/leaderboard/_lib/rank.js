/**
 * Every leaderboard rule lives here.
 *
 * The module is pure — no Prisma, no `next/*`, no React — so the ordering, the
 * guess counting and the name formatting can be reasoned about (and reused)
 * without a database. Nothing downstream may re-derive one of these rules: the
 * components render the rows they are handed.
 *
 * It is also the privacy boundary. `isYou` is resolved here against the
 * viewer's id and the identifiers are then dropped, so no row that leaves this
 * module carries a user id or an email.
 */

const MAX_GUESSES = 6;

/**
 * How many guesses a finished game used, always in 1..6.
 *
 * `guesses` is `Json?` and is null on rows written before it was persisted, so
 * fall back to `row + 1` — on a win `row` is the winning row index and is never
 * incremented (see `(game)/_lib/compare.js`). The concede path (`IQUIT`) sets
 * `row: 6`, which is why the result is clamped.
 * @param {Object} game - A completed WordleGame row
 * @returns {Number} Guesses used, 1..6
 */
export const guessCountOf = (game) => {
  const n = Array.isArray(game?.guesses) ? game.guesses.length : 0;
  const count = n > 0 ? n : (game?.row ?? 0) + 1;
  return Math.min(Math.max(count, 1), MAX_GUESSES);
};

/**
 * Up to two initials, from the first and last words of a name.
 * @param {String} name - The player's name, possibly null
 * @returns {String} Initials, or "?" when there is no name
 */
export const initialsOf = (name) => {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";

  const first = words[0][0];
  const last = words.length > 1 ? words[words.length - 1][0] : "";
  return `${first}${last}`.toUpperCase();
};

/**
 * The name to show for a player who never set one.
 * @param {String} name - The player's name, possibly null
 * @returns {String} A non-empty display name
 */
export const displayName = (name) => {
  const trimmed = (name ?? "").trim();
  return trimmed.length > 0 ? trimmed : "Anonymous";
};

const timeOf = (value) => {
  const time = new Date(value ?? 0).getTime();
  return Number.isNaN(time) ? 0 : time;
};

/**
 * Assign competition ranks — equal keys share a rank and the next rank skips.
 * @param {Array} rows - Rows already in display order
 * @param {Function} keyOf - Produces the comparison key for a row
 * @returns {Array} The same rows with a `rank` property
 */
const withRanks = (rows, keyOf) => {
  let rank = 0;
  let previousKey = null;

  return rows.map((row, index) => {
    const key = keyOf(row);
    if (key !== previousKey) {
      rank = index + 1;
      previousKey = key;
    }
    return { ...row, rank };
  });
};

/**
 * Rank everyone who finished today's puzzle.
 *
 * Wins come before losses, then fewer guesses, then whoever finished first.
 * Finishing first only breaks the *display* order — the rank itself is keyed on
 * (win, guessCount), so two players who solved it in three share a rank.
 * @param {Array} games - Today's completed games, each with `user.name`
 * @param {String} viewerId - The signed-in user's id, or null
 * @returns {Array} TodayRow[] — { rank, name, initials, win, guessCount, expert, isYou }
 */
export const rankToday = (games, viewerId) => {
  const rows = (games ?? [])
    .map((game) => ({
      name: displayName(game.user?.name),
      initials: initialsOf(game.user?.name),
      win: game.win === true,
      guessCount: guessCountOf(game),
      expert: game.expert === true,
      isYou: Boolean(viewerId) && game.userId === viewerId,
      finishedAt: timeOf(game.updatedAt),
    }))
    .sort((a, b) => {
      if (a.win !== b.win) return a.win ? -1 : 1;
      if (a.guessCount !== b.guessCount) return a.guessCount - b.guessCount;
      return a.finishedAt - b.finishedAt;
    })
    // `finishedAt` only ever broke the display order; it never leaves here.
    .map(({ finishedAt, ...row }) => row);

  return withRanks(rows, (row) => `${row.win}|${row.guessCount}`);
};

/**
 * Rank opted-in players over every game they have completed.
 *
 * Users with no completed games are dropped — an empty row says nothing and
 * would sit at the bottom of the board forever. `avgGuesses` is null for a
 * player who has never won (there is no average to take) and sorts last.
 * @param {Array} users - Opted-in users with their completed `wordleGames`
 * @param {String} viewerId - The signed-in user's id, or null
 * @returns {Array} AllTimeRow[] — { rank, name, initials, played, wins, winPct,
 *                  avgGuesses, streak, maxStreak, isYou }
 */
export const rankAllTime = (users, viewerId) => {
  const rows = (users ?? [])
    .map((user) => {
      const games = user.wordleGames ?? [];
      const won = games.filter((game) => game.win === true);
      const played = games.length;
      const wins = won.length;
      const totalGuesses = won.reduce(
        (total, game) => total + guessCountOf(game),
        0
      );

      return {
        name: displayName(user.name),
        initials: initialsOf(user.name),
        played,
        wins,
        winPct: played > 0 ? Math.round((wins / played) * 100) : 0,
        avgGuesses:
          wins > 0 ? Math.round((totalGuesses / wins) * 100) / 100 : null,
        streak: user.streak ?? 0,
        maxStreak: user.maxStreak ?? 0,
        isYou: Boolean(viewerId) && user.id === viewerId,
      };
    })
    .filter((row) => row.played > 0)
    .sort((a, b) => {
      if (a.wins !== b.wins) return b.wins - a.wins;
      if (a.avgGuesses !== b.avgGuesses) {
        if (a.avgGuesses === null) return 1;
        if (b.avgGuesses === null) return -1;
        return a.avgGuesses - b.avgGuesses;
      }
      if (a.maxStreak !== b.maxStreak) return b.maxStreak - a.maxStreak;
      return a.name.localeCompare(b.name);
    });

  return withRanks(
    rows,
    (row) => `${row.wins}|${row.avgGuesses}|${row.maxStreak}`
  );
};
