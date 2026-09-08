#!/usr/bin/env node
/**
 * Regenerate `src/data/mini-motorways.json` from the local Mini Motorways save.
 *
 *   node .claude/skills/mini-motorways-stats/extract.js
 *   node .claude/skills/mini-motorways-stats/extract.js --stdout   # don't write
 *
 * The game keeps everything in two UTF-16LE JSON files in its Unity LocalLow
 * directory (Steam Cloud mirrors the identical bytes under
 * `Steam/userdata/<id>/1127500/remote`, so either source works):
 *
 *   userProfile_<guid>.json          achievements + per-city/mode statistics
 *   extendedUserProfile_<guid>.json  lifetime counters + challenge scores
 *
 * There is no public Mini Motorways API. Steam's Web API exposes the
 * achievement list for appid 1127500 and nothing else, so these files are the
 * only source for the per-city numbers.
 *
 * Output is deliberately deterministic — sorted, and stamped with the save
 * file's own `savedAt` rather than the time this ran — so re-running without
 * having played produces no diff.
 */

const fs = require("fs");
const os = require("os");
const path = require("path");

const OUT = path.join(__dirname, "..", "..", "..", "src", "data", "mini-motorways.json");
const SCHEMA = 2;

/** Game order, not alphabetical — this is the order the site should render. */
const MODE_ORDER = ["Normal", "Expert", "Endless"];

/**
 * The game's lifetime counters, renamed so the whole file reads as one
 * convention. A counter added by a future update won't be in this map; it is
 * passed through under its original name rather than dropped, and reported.
 */
const TOTALS = {
  DCPlayed: "dailyChallengesPlayed",
  WCPlayed: "weeklyChallengesPlayed",
  TotalScore: "totalScore",
  TotalConcrete: "concretePlaced",
  TotalConcreteDeleted: "concreteDeleted",
  TotalMotorways: "motorways",
  TotalBridges: "bridges",
  TotalTunnels: "tunnels",
  TotalRoundabouts: "roundabouts",
  TotalTrafficLights: "trafficLights",
  TreesBulldozed: "treesBulldozed",
  TotalEndlessMilestonesAchieved: "endlessMilestones",
};

const unmappedTotals = [];

const candidateDirs = () => {
  // An explicit MM_SAVE_DIR is an override, not a preference: falling back to
  // the default when it is wrong would quietly publish another profile's stats.
  if (process.env.MM_SAVE_DIR) return [process.env.MM_SAVE_DIR];

  const home = os.homedir();
  const dirs = [];
  dirs.push(
    path.join(home, "AppData/LocalLow/Dinosaur Polo Club/Mini Motorways"),
    path.join(home, "Library/Application Support/Dinosaur Polo Club/Mini Motorways")
  );
  // Steam Cloud's mirror, whichever library Steam lives in.
  for (const steam of ["C:/Program Files (x86)/Steam", path.join(home, "Library/Application Support/Steam")]) {
    const userdata = path.join(steam, "userdata");
    if (!fs.existsSync(userdata)) continue;
    for (const id of fs.readdirSync(userdata)) {
      dirs.push(path.join(userdata, id, "1127500", "remote"));
    }
  }
  return dirs;
};

/**
 * .NET `DateTime.ToBinary()` split across two int32s: a 62-bit tick count with
 * a 2-bit DateTimeKind riding on top. Mask the Kind off or you land in 16640.
 */
const dotNetTime = (high, low) => {
  const ticks = ((BigInt(high | 0) << 32n) | BigInt(low >>> 0)) & 0x3fffffffffffffffn;
  return new Date(Number(ticks / 10000n) - 62135596800000).toISOString();
};

/** Save files are UTF-16LE; a utf8 read yields `{ " _ u t c ...`. */
const readSave = (file) => JSON.parse(fs.readFileSync(file, "utf16le"));

/**
 * A save directory can hold more than one profile GUID (a second account, or a
 * stale one). Take the pair whose userProfile saved most recently.
 */
const findProfile = () => {
  const tried = [];
  for (const dir of candidateDirs()) {
    tried.push(dir);
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir);
    const guids = files
      .map((f) => /^userProfile_(.+)\.json$/.exec(f)?.[1])
      .filter((g) => g && files.includes(`extendedUserProfile_${g}.json`));

    const found = guids
      .map((guid) => {
        const profile = readSave(path.join(dir, `userProfile_${guid}.json`));
        return {
          dir,
          guid,
          profile,
          extended: readSave(path.join(dir, `extendedUserProfile_${guid}.json`)),
          savedAt: dotNetTime(profile._utcSaveTime_high, profile._utcSaveTime_low),
        };
      })
      .sort((a, b) => b.savedAt.localeCompare(a.savedAt));

    if (found.length) return found[0];
  }
  throw new Error(
    `No Mini Motorways save found. Looked in:\n  ${tried.join("\n  ")}\n` +
      `Set MM_SAVE_DIR to the folder holding userProfile_<guid>.json.`
  );
};

const build = ({ profile, extended, savedAt }) => {
  const cities = profile.allCityStatistics
    .map((c) => ({
      city: c.CityId,
      mode: c.Mode,
      best: c.MaxTrips,
      bestDays: c.MaxTripsDayCount,
      bestAverage: c.MaxAverageTrips,
      totalTrips: c.TotalTrips,
      longestDays: c.MaxDuration,
      totalDays: c.TotalDuration,
      playTime: c.TotalPlayTime,
    }))
    .sort(
      (a, b) =>
        a.city.localeCompare(b.city) || MODE_ORDER.indexOf(a.mode) - MODE_ORDER.indexOf(b.mode)
    );

  const achievements = profile._achievements;
  const played = cities.filter((c) => c.totalTrips > 0);

  return {
    schema: SCHEMA,
    // The save file's own timestamp, not this run's — see the header comment.
    savedAt,
    totals: {
      // Lifetime counters the game maintains for achievement progress.
      ...Object.fromEntries(
        Object.entries(extended.AchievementStats).map(([key, value]) => {
          if (!TOTALS[key]) unmappedTotals.push(key);
          return [TOTALS[key] ?? key, value];
        })
      ),
      playTime: cities.reduce((sum, c) => sum + c.playTime, 0),
      bestScore: cities.reduce((max, c) => Math.max(max, c.best), 0),
      citiesPlayed: new Set(played.map((c) => c.city)).size,
      cityModesPlayed: played.length,
    },
    achievements: {
      complete: achievements.filter((a) => a.isComplete).length,
      total: achievements.length,
      incomplete: achievements
        .filter((a) => !a.isComplete)
        .map((a) => a.Id)
        .sort(),
    },
    cities,
    challenges: {
      // Per-city challenge bests. Every row the game has written is kept, so
      // this row set *is* the roster of challenges the installed version knows
      // about — filtering to the beaten ones would make the site show only the
      // wins. `best: null` means unattempted; the save stores that as `0`, and
      // `0` is also a legal score, so the ambiguity is resolved here rather
      // than left for every consumer to get wrong. `mode` is the game's raw
      // enum; every observed row is 0, so it is passed through rather than
      // mapped to a guessed name.
      cities: extended.AllCityChallengeScores.map((c) => ({
        city: c.CityId,
        mode: c.Mode,
        index: c.ChallengeIndex,
        best: c.BestScore > 0 ? c.BestScore : null,
      })).sort((a, b) => a.city.localeCompare(b.city) || a.index - b.index),
      // The daily/weekly currently in flight. `null` means not yet attempted —
      // the game's own sentinel here is `-1`, normalised so the whole file
      // carries one representation of "no score". `expiry` is a unix second at
      // which the slot resets.
      current: Object.fromEntries(
        Object.entries(extended.AllChallengeScores)
          .map(([name, c]) => [
            name.toLowerCase(),
            { score: c.Score < 0 ? null : c.Score, expiry: c._expiry },
          ])
          .sort(([a], [b]) => a.localeCompare(b))
      ),
    },
  };
};

const found = findProfile();
const data = build(found);
const json = `${JSON.stringify(data, null, 2)}\n`;

if (process.argv.includes("--stdout")) {
  process.stdout.write(json);
} else {
  const before = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8") : null;
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, json);

  const rel = path.relative(process.cwd(), OUT).replace(/\\/g, "/");
  const hm = (s) => `${Math.floor(s / 3600)}h${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}m`;

  console.log(`source     ${found.dir}`);
  console.log(`saved      ${data.savedAt}`);
  console.log(`${before === null ? "created   " : before === json ? "unchanged " : "updated   "} ${rel}`);
  console.log(
    `stats      ${data.achievements.complete}/${data.achievements.total} achievements · ` +
      `best ${data.totals.bestScore} · ${hm(data.totals.playTime)} · ` +
      `${data.totals.cityModesPlayed} city/mode combos`
  );
  if (unmappedTotals.length) {
    console.log(
      `note       new counter(s) passed through unrenamed: ${unmappedTotals.join(", ")}\n` +
        `           add them to TOTALS in ${path.basename(__filename)} to give them site-facing names`
    );
  }
}
