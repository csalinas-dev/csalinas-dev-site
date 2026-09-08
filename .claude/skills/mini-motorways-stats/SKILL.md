---
name: mini-motorways-stats
description: Regenerate src/data/mini-motorways.json from the local Mini Motorways save file, so the site can render current stats. Use after playing Mini Motorways, or whenever the Mini Motorways stats on the site are stale.
---

# Mini Motorways stats

Reads the local Mini Motorways save and rewrites `src/data/mini-motorways.json`,
the file the site imports as `@/data/mini-motorways.json`.

## Run it

```bash
node .claude/skills/mini-motorways-stats/extract.js
```

That is the whole job — the script is the source of truth for the transform, so
don't hand-edit the JSON or re-derive its contents by reading the save yourself.
Add `--stdout` to preview without writing.

Report the summary it prints, then stop. Only keep going if it says something
unexpected — see below.

## Reading the output

```
source     C:\Users\...\LocalLow\Dinosaur Polo Club\Mini Motorways
saved      2026-09-07T19:17:34.674Z
updated    src/data/mini-motorways.json
stats      187/187 achievements · best 79130 · 82h03m · 60 city/mode combos
```

- **`unchanged`** is a normal, healthy result, not a failure. Output is
  deterministic and stamped with the *save file's* timestamp rather than the run
  time, so a run with no play since the last one produces no diff. If it says
  `unchanged` after a session, the game had not flushed its save — quit Mini
  Motorways fully and run again.
- **`note  new counter(s) passed through unrenamed:`** means a game update added
  a lifetime counter. It is in the JSON under its raw name and nothing is lost;
  add it to `TOTALS` in `extract.js` to give it a site-facing name.
- **`No Mini Motorways save found`** lists every directory tried. Point
  `MM_SAVE_DIR` at the folder holding `userProfile_<guid>.json`.

## Shape of the JSON

`schema` is bumped when a change would break a consumer, so grep for the import
before changing a field name.

```jsonc
{
  "schema": 2,
  "savedAt": "2026-09-07T19:17:34.674Z",
  "totals": { "totalScore": 279173, "bestScore": 79130, "playTime": 295382, ... },
  "achievements": { "complete": 187, "total": 187, "incomplete": [] },
  "cities": [ { "city": "Beijing", "mode": "Normal", "best": 3575,
                "totalTrips": 5440, "playTime": 4708, ... } ],
  "challenges": {
    "cities":  [ { "city": "Beijing", "mode": 0, "index": 0, "best": null },
                 { "city": "Beijing", "mode": 0, "index": 1, "best": 724 } ],
    "current": { "daily": { "score": 4514, "expiry": 1788825600 },
                 "weekly": { "score": null, "expiry": 1789344000 } }
  }
}
```

- All durations (`playTime`) are **seconds**; `expiry` is a **unix second**.
- `cities` has one row per city *and mode*, sorted by city then Normal → Expert →
  Endless. 26 cities, 60 rows.
- **Unattempted is `null`**, in both `challenges.cities[].best` and
  `challenges.current[].score`. `0` is a real score and is never a sentinel —
  that is exactly why the raw save's `0` (per-city bests) and `-1`
  (daily/weekly) are both normalised to `null` here.
- `challenges.cities` holds **one row per challenge the installed game knows
  about**, beaten or not — 44 rows over 26 cities today (9 cities × 1 challenge,
  16 × 2, 1 × 3), 29 of them with a score. The roster is only as complete as the
  installed game version has written: a challenge added by a future update
  appears once the game writes its row.
- `totals` are **whole-game** counters and include Endless, daily and weekly.
  `totals.bestScore` is 79,130 — Manila *Endless*, over ten times the best
  Classic score. The site deliberately renders none of it.
- `TotalPlayTime === TotalDuration` on all 60 rows in the save, so the "seconds"
  unit on `playTime` is an inference rather than a fact, and the site renders no
  play-time figure at all. `cities[].bestAverage` is `0` on all 60 rows.

## Where the data comes from

Two UTF-16LE JSON files in the game's Unity LocalLow directory. Steam Cloud
mirrors the identical bytes under `Steam/userdata/<id>/1127500/remote`, which
the script falls back to.

There is **no public Mini Motorways API**. Dinosaur Polo Club publishes no
endpoints, and Steam's Web API exposes only the achievement list for appid
1127500 — none of the per-city numbers. If asked to fetch these from a service,
say so rather than looking for one.

Because the save is a local file, the JSON is a build-time artifact: it has to be
committed to reach production. There is nothing to fetch at runtime.
