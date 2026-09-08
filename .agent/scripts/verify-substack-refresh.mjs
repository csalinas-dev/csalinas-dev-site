// Verification harness for the refresh gate and the sync report.
//
//   node .agent/scripts/verify-substack-refresh.mjs
//
// This repo has no test runner — `package.json` has only
// dev/build/start/lint/sync:substack — so the checks are this script. It prints
// one line per check and exits non-zero if any fail.
//
// NO NETWORK, NO DATABASE, NO NEXT, AND NO RESOLVE HOOK. Both modules under test
// (src/lib/substack/throttle.js and scripts/lib/sync-report.mjs) have zero
// imports precisely so this file can load them with bare `node`. The clock is
// injected and `run` is a counter, so "ten simultaneous callers produce one sync"
// is a measurement rather than a claim.
//
// Every check ANCHORS first: it asserts the input really contains the thing being
// probed before asserting the output. Without that, an input that quietly stopped
// carrying a `|` reads as a pass, which is the one way a script like this goes
// silently useless.
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// throttle.js is `.js` under a package.json with no `"type"`, so Node reparses it
// as ESM and warns once. Silence that ONE code — not --no-warnings, which would
// hide the next real one.
const SILENCE = "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON";

if (!process.execArgv.includes(SILENCE)) {
  const { status } = spawnSync(
    process.execPath,
    [SILENCE, fileURLToPath(import.meta.url), ...process.argv.slice(2)],
    { stdio: "inherit" }
  );

  process.exit(status ?? 1);
}

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");

const load = (path) => import(pathToFileURL(join(ROOT, path)).href);

const { createRefreshGate } = await load("src/lib/substack/throttle.js");
const { classify, summaryMarkdown, cell } = await load("scripts/lib/sync-report.mjs");

// ── harness ────────────────────────────────────────────────────────────────
let failures = 0;

const checkAsync = async (name, run) => {
  try {
    const note = await run();

    console.log(`  ok    ${name}${note ? ` — ${note}` : ""}`);
  } catch (error) {
    failures += 1;
    console.log(`  FAIL  ${name}\n          ${error.message}`);
  }
};

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const assertEq = (actual, expected, message) =>
  assert(
    actual === expected,
    `${message}\n          expected ${JSON.stringify(expected)}\n          got      ${JSON.stringify(actual)}`
  );

// The anchor helper. Every probe states, in the check itself, what its input has
// to contain for the probe to mean anything.
const anchor = (condition, what) =>
  assert(condition, `ANCHOR FAILED: ${what} — this check would have passed vacuously`);

const section = (title) => console.log(`\n${title}`);

// A promise's settledness, without awaiting it. `Promise.race` against an
// already-resolved sentinel resolves to the sentinel iff the promise is pending.
const PENDING = Symbol("pending");
const isPending = async (promise) =>
  (await Promise.race([promise, Promise.resolve(PENDING)])) === PENDING;

// ── the gate ───────────────────────────────────────────────────────────────
section("refresh gate (src/lib/substack/throttle.js)");

// A clock we move by hand, and a `run` that counts and can be held open.
const harness = ({ intervalMs = 1000, maxRunMs = 500, run } = {}) => {
  const state = { t: 0, calls: 0, resolvers: [] };

  const gate = createRefreshGate({
    intervalMs,
    maxRunMs,
    now: () => state.t,
    run:
      run ??
      (() => {
        state.calls += 1;

        return new Promise((resolve) => state.resolvers.push(resolve));
      }),
  });

  return { state, gate, settle: () => state.resolvers.splice(0).forEach((r) => r()) };
};

// The gate starts `run` on a microtask (`Promise.resolve().then(run)`), so that
// a synchronously-throwing `run` cannot escape the calling frame. Drain the
// queue before reading the call counter — its STATE, though, is assigned
// synchronously, which is the property the stampede check relies on.
const tick = () => new Promise((resolve) => setImmediate(resolve));

await checkAsync("one call starts exactly one run", async () => {
  const { state, gate } = harness();

  anchor(state.calls === 0, "the harness started with a non-zero call count");

  const promise = gate();

  assert(promise !== null, "the first call returned null instead of a promise");

  await tick();

  assertEq(state.calls, 1, "the first call did not invoke run exactly once");

  return "1 call";
});

await checkAsync("TEN concurrent callers produce ONE run and share ONE promise", async () => {
  const { state, gate } = harness();

  // All ten in ONE synchronous turn — which is the condition the gate has to
  // survive, and the one an `await` between its check and its assignment breaks.
  const promises = Array.from({ length: 10 }, () => gate());

  anchor(promises.length === 10, "fewer than ten callers were made");
  anchor(await isPending(promises[0]), "the first run settled before the other nine called");

  await tick();

  assertEq(state.calls, 1, "ten concurrent callers invoked run more than once — THE STAMPEDE IS BACK");
  assert(
    promises.every((p) => p === promises[0]),
    "the ten callers did not all receive the SAME promise object — an await has been " +
      "introduced between the gate's check and its assignment"
  );

  return `${state.calls} run for 10 callers`;
});

await checkAsync("the interval is closed at t+interval-1 and open at t+interval", async () => {
  const { state, gate, settle } = harness({ intervalMs: 1000 });

  gate();
  await tick();
  settle();
  await tick();

  anchor(state.calls === 1, "the first run did not happen, so the interval is untested");

  state.t = 999;
  assertEq(gate(), null, "a call one tick inside the interval was not refused");
  await tick();
  assertEq(state.calls, 1, "a call inside the interval invoked run");

  state.t = 1000;
  assert(gate() !== null, "a call exactly at the interval boundary was refused");
  await tick();
  assertEq(state.calls, 2, "a call at the interval boundary did not invoke run");

  return "999 refused, 1000 allowed";
});

await checkAsync("a FAILED run still consumes the whole interval", async () => {
  const state = { calls: 0 };
  const { gate } = harness({
    intervalMs: 1000,
    run: () => {
      state.calls += 1;

      // A feed-scope failure is a resolved report, not a rejection — the shape
      // runSubstackSync actually returns.
      return Promise.resolve({ report: { ok: false }, status: null });
    },
  });

  gate();
  await tick();

  anchor(state.calls === 1, "the failing run never happened");

  assertEq(gate(), null, "a broken feed was re-fetched inside the interval");
  await tick();
  assertEq(state.calls, 1, "a broken feed was re-fetched inside the interval");

  return "1 attempt, not 2";
});

await checkAsync("a wedged run is joined inside maxRunMs and abandoned after it", async () => {
  const { state, gate } = harness({ intervalMs: 1000, maxRunMs: 500 });

  const first = gate();

  anchor(await isPending(first), "the first run is not genuinely still pending");
  anchor(state.calls === 1, "the first run never started");

  state.t = 499;
  assert(gate() === first, "a call inside maxRunMs did not join the in-flight run");
  await tick();
  assertEq(state.calls, 1, "a call inside maxRunMs started a second run");

  // Past maxRunMs AND past the interval: the run is presumed wedged and must not
  // disable the feature forever.
  state.t = 1000;
  const second = gate();

  assert(second !== null && second !== first, "a wedged run was never abandoned");
  await tick();
  assertEq(state.calls, 2, "a wedged run did not give way to a new one");

  return "joined at 499, replaced at 1000";
});

await checkAsync("a run that throws synchronously never escapes refresh()", async () => {
  const { gate } = harness({
    run: () => {
      throw new Error("boom");
    },
  });

  let promise;

  // The calling frame is a render. It must not see an exception.
  try {
    promise = gate();
  } catch (error) {
    throw new Error(`refresh() threw out of the calling frame: ${error.message}`);
  }

  anchor(promise !== null, "no run was started, so nothing was thrown to swallow");

  // And the promise several callers may be holding must not reject either — one
  // unhandled rejection takes the process down.
  const settled = await promise.then(
    () => "resolved",
    () => "rejected"
  );

  assertEq(settled, "resolved", "the returned promise rejected");

  return "swallowed";
});

// ── the report ─────────────────────────────────────────────────────────────
section("sync report (scripts/lib/sync-report.mjs)");

const post = (over = {}) => ({
  sourceId: "https://example.substack.com/p/one",
  slug: "one",
  action: "unchanged",
  embedsRemoved: 0,
  imagesDropped: 0,
  ...over,
});

const report = (over = {}) => ({
  ok: true,
  feedUrl: "https://example.substack.com/feed",
  startedAt: new Date("2026-08-16T12:00:00.000Z"),
  finishedAt: new Date("2026-08-16T12:00:01.000Z"),
  durationMs: 1000,
  itemsSeen: 20,
  created: 1,
  updated: 0,
  unchanged: 19,
  skipped: 0,
  posts: [post({ action: "created" }), ...Array.from({ length: 19 }, (_, i) => post({ slug: `p${i}` }))],
  errors: [],
  ...over,
});

await checkAsync("a clean report is exit 0 with no Errors and no Content-removed table", async () => {
  const input = report();

  anchor(input.ok === true && input.errors.length === 0, "the clean report is not actually clean");

  assertEq(classify(input), 0, "a clean report did not classify as 0");

  const md = summaryMarkdown(input);

  assert(md.includes("20 seen · 1 created"), "the headline counts are missing");
  assert(md.includes("✅ clean"), "the clean status line is missing");
  assert(!md.includes("### Errors"), "a clean report rendered an Errors table");
  assert(!md.includes("### Content removed"), "a clean report rendered a Content-removed table");

  return "exit 0";
});

await checkAsync("a feed-scope failure is exit 1 and says nothing was written", async () => {
  const input = report({
    ok: false,
    itemsSeen: 0,
    created: 0,
    unchanged: 0,
    posts: [],
    errors: [{ scope: "feed", message: "feed request failed" }],
  });

  anchor(input.ok === false && input.errors[0].scope === "feed", "the input is not a feed-scope failure");

  assertEq(classify(input), 1, "a feed-scope failure did not classify as 1");

  const md = summaryMarkdown(input);

  assert(md.includes("nothing was written"), "the summary does not say nothing was written");
  assert(md.includes("### Errors"), "the summary omitted the Errors table");

  return "exit 1";
});

await checkAsync("item-scope errors alone are exit 2, NOT 1", async () => {
  const input = report({
    ok: true,
    skipped: 1,
    errors: [{ scope: "item", sourceId: "https://example.substack.com/p/bad", message: "missing title" }],
  });

  anchor(input.ok === true, "the input's ok flag is not true, so this proves nothing");
  anchor(input.errors[0].scope === "item", "the input's error is not item-scope");

  // The check that protects part 1's distinction: one malformed post is not a
  // broken sync and must never fail a deploy.
  assertEq(classify(input), 2, "an item-scope error was promoted to a feed-scope failure");

  const md = summaryMarkdown(input);

  assert(md.includes("⚠️ 1 item skipped"), "the summary did not report the skipped item");

  return "exit 2";
});

await checkAsync("embedsRemoved/imagesDropped reach the Content-removed table", async () => {
  const input = report({
    posts: [post({ slug: "stripped", embedsRemoved: 3, imagesDropped: 1 })],
  });

  anchor(
    input.posts[0].embedsRemoved === 3 && input.posts[0].imagesDropped === 1,
    "the input report no longer carries the two counters"
  );

  const md = summaryMarkdown(input);

  assert(md.includes("### Content removed"), "the Content-removed table is missing");

  const row = md.split("\n").find((line) => line.startsWith("| stripped |"));

  assert(row, "the stripped post has no row in the Content-removed table");
  assert(row.includes("| 3 |"), "the embedsRemoved count is missing from the row");
  assert(row.trim().endsWith("| 1 |"), "the imagesDropped count is missing from the row");
  assert(md.includes("3 embeds removed · 1 images dropped"), "the headline omits the counters");

  return "3 embeds, 1 image";
});

await checkAsync("a hostile report cannot break a table or open a code fence", async () => {
  const nastyId = "https://evil.example/p/a|b";
  const nastyMessage = "line one\nline two ` | injected";

  const input = report({
    ok: true,
    errors: [{ scope: "item", sourceId: nastyId, message: nastyMessage }],
    posts: [post({ slug: "a|b`c", action: "created", embedsRemoved: 1 })],
  });

  anchor(nastyId.includes("|"), "the hostile sourceId no longer contains a pipe");
  anchor(nastyMessage.includes("\n") && nastyMessage.includes("`") && nastyMessage.includes("|"),
    "the hostile message no longer contains a newline, a backtick and a pipe");
  anchor(input.posts[0].slug.includes("|"), "the hostile slug no longer contains a pipe");

  const md = summaryMarkdown(input);

  for (const line of md.split("\n")) {
    if (!line.startsWith("|")) continue;

    const cells = line.split("|").slice(1, -1);

    for (const c of cells) {
      assert(!c.includes("`"), `a table cell carries a backtick: ${JSON.stringify(line)}`);
    }

    // Every row in every table has a fixed column count; a surviving `|` would
    // add one, and a surviving newline would have split the row in two.
    assert(cells.length === 2 || cells.length === 3, `a table row has ${cells.length} columns: ${JSON.stringify(line)}`);
  }

  // The newline is neutralized by collapsing, not by deleting: both halves of
  // the message must survive on ONE row rather than splitting it in two.
  const messageRows = md.split("\n").filter((line) => line.includes("line one"));

  assertEq(messageRows.length, 1, "the hostile message appears on more than one line");
  assert(messageRows[0].includes("line two"), "the message was split across rows by its newline");
  assert(
    !md.split("\n").some((line) => line.trimStart().startsWith("line two")),
    "the message's second line escaped its table cell"
  );

  assertEq(cell("a|b`c\nd"), "a b c d", "cell() did not neutralize all four characters");

  return "no cell escaped";
});

await checkAsync("tables cap at 60 rows and say how many were dropped", async () => {
  const posts = Array.from({ length: 200 }, (_, i) =>
    post({ slug: `post-${i}`, action: "created", embedsRemoved: 1 })
  );

  anchor(posts.length === 200, "fewer than 200 posts were built, so the cap is untested");

  const md = summaryMarkdown(report({ posts, created: 200 }));

  const rows = md.split("\n").filter((line) => line.startsWith("| post-"));

  // 60 in Changes and 60 in Content removed.
  assertEq(rows.length, 120, "the tables were not capped at 60 rows each");
  assert(md.includes("_…and 140 more_"), "the truncation note is missing or miscounted");

  return "60 + 60 rows, 140 noted";
});

await checkAsync("a status argument renders the read-path history", async () => {
  const status = {
    ok: false,
    lastAttemptAt: new Date("2026-08-16T12:00:00.000Z"),
    lastSuccessAt: new Date("2026-08-09T12:00:00.000Z"),
    consecutiveFailures: 42,
    firstFailureAt: new Date("2026-08-09T13:00:00.000Z"),
    lastReason: "feed request failed",
  };

  anchor(status.consecutiveFailures === 42, "the status row does not carry a failure count");

  const md = summaryMarkdown(report(), { status, runUrl: "https://example.com/run/1" });

  assert(md.includes("### Read-path history"), "the read-path history section is missing");
  assert(md.includes("Consecutive failures: 42"), "the consecutive-failure count is missing");
  assert(md.includes("2026-08-09T12:00:00.000Z"), "the last success time is missing");
  assert(md.includes("https://example.com/run/1"), "the run URL is missing");

  // Without a status the section must not appear at all.
  assert(!summaryMarkdown(report()).includes("Read-path history"), "the section appeared without a status");

  return "42 failures reported";
});

// ── result ─────────────────────────────────────────────────────────────────
console.log(
  failures === 0
    ? "\nAll checks passed."
    : `\n${failures} check${failures === 1 ? "" : "s"} FAILED.`
);

process.exit(failures === 0 ? 0 : 1);
