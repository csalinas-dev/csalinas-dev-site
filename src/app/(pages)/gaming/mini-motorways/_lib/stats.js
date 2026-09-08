/**
 * Everything the Mini Motorways page renders is derived here, on the server,
 * and nothing else is. That is the mechanism — not a convention — by which the
 * excluded data cannot reach the page: `page.js` imports the raw JSON, calls
 * `buildStats`, and hands the client component display-ready props, so the
 * 17.4 KB artifact never enters the client bundle at all.
 *
 * Two exclusions this module exists to enforce:
 *
 *   - `data.totals` is never read. Those are whole-game counters that include
 *     Endless, daily and weekly: `totals.bestScore` is 79,130 (Manila Endless),
 *     over ten times the best Classic score. Top-level `data.achievements` is a
 *     sibling of `totals`, not a member of it, and is the one summary figure
 *     taken straight from the file.
 *   - `data.challenges.current` (the daily/weekly in flight) is never read, and
 *     `cities` rows are filtered to Classic and Expert, which is what drops
 *     Endless.
 *
 * Numbers are formatted to strings here rather than in the view. A number
 * formatted on the client can disagree with the same number formatted during
 * prerender; a string cannot.
 */

const NUMBER = new Intl.NumberFormat("en-US");

/** The save's `Normal` is what the game calls Classic, and what the page says. */
const CLASSIC = "Classic";
const EXPERT = "Expert";

/**
 * `cities[].city` is a PascalCase id. Only the ids that need splitting are
 * listed; the rest already read correctly. No diacritics on Reykjavik or
 * Zurich — the game anglicises Munich and Mexico City, so this is consistent
 * rather than half-localised.
 */
export const CITY_NAMES = {
  CapeTown: "Cape Town",
  ChiangMai: "Chiang Mai",
  DarEsSalaam: "Dar es Salaam",
  HongKong: "Hong Kong",
  LosAngeles: "Los Angeles",
  MexicoCity: "Mexico City",
  NewYorkCity: "New York City",
  RioDeJaneiro: "Rio de Janeiro",
};

/** Falls back to the raw id so a city a future update adds renders as
 *  `NewCity` rather than blank. */
export const cityName = (id) => CITY_NAMES[id] ?? id;

export const buildStats = (data) => {
  // Classic and Expert only. This is the line that excludes Endless.
  const rows = data.cities
    .filter((c) => c.mode === "Normal" || c.mode === "Expert")
    .map((c) => ({ ...c, label: c.mode === "Normal" ? CLASSIC : EXPERT }));

  // Bars are scaled per mode, not against one shared max: a shared max would
  // squash every Expert bar into a stub to encode the uninteresting fact that
  // Expert scores are lower than Classic ones.
  const maxFor = (label) =>
    rows.filter((r) => r.label === label).reduce((max, r) => Math.max(max, r.best), 0);
  const maxes = { [CLASSIC]: maxFor(CLASSIC), [EXPERT]: maxFor(EXPERT) };

  // `null` rather than a throw when there are no rows: the JSON is a committed
  // artifact, so "no rows" means somebody replaced it with a stub, and the page
  // has an empty state for exactly that.
  const bestIn = (label) => {
    const inMode = rows.filter((r) => r.label === label);
    if (!inMode.length) return null;
    const row = inMode.reduce((best, r) => (r.best > best.best ? r : best));
    return { score: NUMBER.format(row.best), city: cityName(row.city) };
  };

  const ids = [...new Set(rows.map((r) => r.city))];

  const cities = ids
    .map((id) => ({
      id,
      name: cityName(id),
      modes: [CLASSIC, EXPERT].map((label) => {
        const row = rows.find((r) => r.city === id && r.label === label);
        // Every city has both rows today. If one is ever absent the view still
        // renders it, with the `unbeaten` treatment — omitting it would change
        // the card's height and hide the gap.
        return {
          label,
          best: row ? NUMBER.format(row.best) : null,
          days: row ? NUMBER.format(row.bestDays) : null,
          barPct: row && maxes[label] ? (row.best / maxes[label]) * 100 : 0,
        };
      }),
      challenges: data.challenges.cities
        .filter((c) => c.city === id)
        .sort((a, b) => a.index - b.index)
        // `best: null` is what the view turns into the word `unbeaten`. `0` is
        // a real score and stays a `0`.
        .map((c) => ({ index: c.index, best: c.best === null ? null : NUMBER.format(c.best) })),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    // Sliced off the ISO string rather than parsed: `Date.parse` plus local
    // formatting lets the server and the client disagree about the day.
    savedAtDay: data.savedAt.slice(0, 10),
    summary: {
      cities: new Set(rows.filter((r) => r.totalTrips > 0).map((r) => r.city)).size,
      bestClassic: bestIn(CLASSIC),
      bestExpert: bestIn(EXPERT),
      challengesBeaten: data.challenges.cities.filter((c) => c.best !== null).length,
      // The full roster, never a filtered count — a denominator that only
      // counted beaten challenges would always read n/n.
      challengesTotal: data.challenges.cities.length,
      achievements: {
        complete: data.achievements.complete,
        total: data.achievements.total,
      },
    },
    cities,
  };
};
