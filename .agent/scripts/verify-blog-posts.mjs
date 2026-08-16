// Verification harness for the blog's data layer (src/lib/blog).
//
//   node .agent/scripts/verify-blog-posts.mjs
//
// This repo has no test runner — `package.json` has only dev/build/start/lint —
// so the module's checks are this script. Same shape as
// verify-substack-sync.mjs: the real modules through the resolve hook in
// ./lib/esm-resolver.mjs, one line per check, non-zero exit on any failure.
//
// NO NETWORK AND NO DATABASE. It loads only the pure half of the module —
// shape.js, headings.js, reading-time.mjs — which is exactly why that half is
// kept free of Prisma, of `.mdx` and of the `@/` alias. The synced inputs are
// built by running the REAL normalizeItem over .agent/fixtures/substack, so the
// shapes checked here are the ones ingestion actually produces rather than ones
// this script invented.
//
// Every check ANCHORS first: it asserts the input really contains the thing
// being probed before asserting the answer. Without that, a fixture that
// silently stopped containing an <h2> reads as a pass.
import { register } from "node:module";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// The module's files are `.js` under a package.json with no `"type"`, so Node
// reparses each one as ESM and warns once per file. Re-exec with that ONE
// warning code disabled — not `--no-warnings`, which would hide the next real
// one too.
const SILENCE = "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON";

if (!process.execArgv.includes(SILENCE)) {
  const { status } = spawnSync(
    process.execPath,
    [SILENCE, fileURLToPath(import.meta.url), ...process.argv.slice(2)],
    { stdio: "inherit" }
  );

  process.exit(status ?? 1);
}

register("./lib/esm-resolver.mjs", import.meta.url);

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const FIXTURES = join(ROOT, ".agent/fixtures/substack");

const load = (path) => import(pathToFileURL(join(ROOT, path)).href);

const { parseFeedXml } = await load("src/lib/substack/feed.js");
const { normalizeItem } = await load("src/lib/substack/normalize.js");
const { MDX_SLUGS } = await load("src/content/posts/slugs.js");
const { adjacentIn, fromMdxPost, fromSyncedRow, mergePosts } = await load("src/lib/blog/shape.js");
const { slugifyHeading, withHeadingIds } = await load("src/lib/blog/headings.js");
const { countHtmlWords, minutesForWords, readingTimeFromHtml, WORDS_PER_MINUTE } = await load(
  "src/lib/blog/reading-time.mjs"
);

// ── harness ────────────────────────────────────────────────────────────────
let failures = 0;

const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const check = (name, run) => {
  try {
    const note = run();

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
    eq(actual, expected),
    `${message}\n          expected ${JSON.stringify(expected)}\n          got      ${JSON.stringify(actual)}`
  );

const section = (title) => console.log(`\n${title}`);

// Captures console.warn so "it warns once, with the slug and nothing else" is a
// measurement rather than a comment.
const captureWarnings = (run) => {
  const original = console.warn;
  const lines = [];

  console.warn = (...args) => lines.push(args.join(" "));

  try {
    return { value: run(), lines };
  } finally {
    console.warn = original;
  }
};

// ── inputs ─────────────────────────────────────────────────────────────────
const fixture = (name) => readFileSync(join(FIXTURES, `${name}.xml`), "utf8");

// The real ingestion pipeline, so these rows are the ones the database would
// hold. `syncedAt`/`createdAt` are irrelevant to the read layer and omitted.
const rowsFromFixture = (name) =>
  parseFeedXml(fixture(name))
    .items.map((item) => normalizeItem(item))
    .filter((result) => result.ok)
    .map(({ post }) => post);

const SYNCED_ROWS = rowsFromFixture("feed-base");

// Stand-ins for the MDX registry's entries — the same fields src/content/posts
// exports, minus the compiled component, which nothing here renders.
const mdxPost = (slug, date, extra = {}) => ({
  slug,
  title: `MDX ${slug}`,
  description: "A hand-written post.",
  date,
  category: "Engineering",
  cover: { src: `/${slug}.png`, width: 1200, height: 630 },
  readingTime: 4,
  Content: () => null,
  ...extra,
});

const MDX_POSTS = [
  mdxPost("hashtag", "2026-08-14"),
  mdxPost("wordleverse", "2026-08-10"),
  mdxPost("goldwater-bank", "2026-08-01"),
].map((post) => fromMdxPost(post));

// ── the shape ──────────────────────────────────────────────────────────────
section("The common shape");

check("the fixture really produces synced rows to work with", () => {
  assert(SYNCED_ROWS.length >= 3, `ANCHOR FAILED: feed-base yielded ${SYNCED_ROWS.length} rows`);
  assert(
    SYNCED_ROWS.every((row) => row.slug && row.contentHtml && row.publishedAt instanceof Date),
    "a normalized row is missing slug, contentHtml or publishedAt"
  );

  return SYNCED_ROWS.map((row) => row.slug).join(", ");
});

check("a summary carries no body, and a full post carries exactly one of Content/contentHtml", () => {
  const summary = fromSyncedRow(SYNCED_ROWS[0]);
  const full = fromSyncedRow(SYNCED_ROWS[0], { full: true });
  const mdx = fromMdxPost(mdxPost("mdx-one", "2026-08-12"), { full: true });

  assertEq(summary.contentHtml, undefined, "a summary carried the article body");
  assertEq(summary.source, "substack", "wrong source tag");

  assert(full.contentHtml && full.Content === null, "a synced post must carry contentHtml and no Content");
  assert(mdx.Content && mdx.contentHtml === null, "an MDX post must carry Content and no contentHtml");

  return "invariant holds both ways";
});

check("a null description or coverImage stays null, and never becomes the string \"null\"", () => {
  const row = { ...SYNCED_ROWS[0], description: null, coverImage: null };

  const post = fromSyncedRow(row, { full: true });

  assertEq(post.description, null, "description was not null");
  assertEq(post.cover, null, "cover was not null");
  assertEq(post.hero, null, "hero was not null");

  return "null stays null";
});

check("date round-trips: new Date(date + 'T00:00:00') is the same calendar day as publishedAt", () => {
  for (const row of SYNCED_ROWS) {
    const { date, publishedAt } = fromSyncedRow(row);
    const back = new Date(date + "T00:00:00");

    assertEq(
      [back.getFullYear(), back.getMonth(), back.getDate()],
      [publishedAt.getFullYear(), publishedAt.getMonth(), publishedAt.getDate()],
      `date "${date}" does not re-parse to the same local day as publishedAt`
    );
  }

  return `${SYNCED_ROWS.length} rows, local midnight`;
});

check("a synced post gets the external-link slot, an MDX post keeps its own", () => {
  const synced = fromSyncedRow(SYNCED_ROWS[0], { full: true });

  assertEq(synced.link, SYNCED_ROWS[0].sourceUrl, "the synced link is not the canonical Substack URL");
  assertEq(synced.linkLabel, "Read on Substack", "wrong link label");

  const mdx = fromMdxPost(mdxPost("m", "2026-01-01", { link: "/games/m", linkLabel: "Play" }), { full: true });

  assertEq([mdx.link, mdx.linkLabel], ["/games/m", "Play"], "an MDX post's own link was overwritten");

  return synced.linkLabel;
});

// ── the collision rule ─────────────────────────────────────────────────────
section("An MDX post always owns its slug");

check("a synced row holding a reserved slug is dropped, and the MDX post is kept", () => {
  assert(MDX_SLUGS.includes("hashtag"), "ANCHOR FAILED: 'hashtag' is no longer a reserved slug");

  const shadow = fromSyncedRow({ ...SYNCED_ROWS[0], slug: "hashtag" });

  assertEq(shadow.slug, "hashtag", "ANCHOR FAILED: the shadowing row does not hold the reserved slug");

  const { value: merged } = captureWarnings(() => mergePosts(MDX_POSTS, [shadow, fromSyncedRow(SYNCED_ROWS[1])]));

  const hashtag = merged.filter((post) => post.slug === "hashtag");

  assertEq(hashtag.length, 1, "the reserved slug appears more than once in the listing");
  assertEq(hashtag[0].source, "mdx", "the synced row won the slug");
  assert(
    !merged.some((post) => post.source === "substack" && post.slug === "hashtag"),
    "the shadowed row survived in the listing"
  );

  return `${merged.length} posts, 1 dropped`;
});

check("the shadowing is warned about once, with the slug and nothing else", () => {
  const shadow = fromSyncedRow({ ...SYNCED_ROWS[0], slug: "hashtag" });
  const { lines } = captureWarnings(() => mergePosts(MDX_POSTS, [shadow]));

  assertEq(lines.length, 1, "expected exactly one warning");
  assert(lines[0].includes("hashtag"), "the warning does not name the slug");

  // #151 section 9: no article content in a log line, ever. The title and the
  // body are the two things a log must never carry.
  assert(!lines[0].includes(shadow.title), "the warning leaked the post title");
  assert(
    !lines[0].includes(SYNCED_ROWS[0].contentHtml.slice(0, 40)),
    "the warning leaked article content"
  );

  return lines[0].slice(0, 80);
});

check("nothing is dropped or warned about when no slug collides", () => {
  const { value: merged, lines } = captureWarnings(() =>
    mergePosts(MDX_POSTS, SYNCED_ROWS.map((row) => fromSyncedRow(row)))
  );

  assertEq(lines.length, 0, `an uncontested merge warned: ${lines.join(" | ")}`);
  assertEq(merged.length, MDX_POSTS.length + SYNCED_ROWS.length, "the merge lost or duplicated a post");

  return `${merged.length} posts, 0 warnings`;
});

// ── ordering ───────────────────────────────────────────────────────────────
section("Ordering and adjacency");

check("the merged list is newest first across both sources", () => {
  const merged = mergePosts(MDX_POSTS, SYNCED_ROWS.map((row) => fromSyncedRow(row)));
  const times = merged.map((post) => post.publishedAt.getTime());

  assert(
    merged.some((post) => post.source === "mdx") && merged.some((post) => post.source === "substack"),
    "ANCHOR FAILED: the list is single-source, so 'across both sources' proves nothing"
  );
  assertEq([...times].sort((a, b) => b - a), times, "the list is not sorted newest first");

  return merged.map((post) => post.source[0]).join("");
});

check("two posts published at the same instant order by slug, whatever order they arrive in", () => {
  const at = new Date("2026-08-14T00:00:00.000Z");
  const rows = ["zeta", "alpha", "mu"].map((slug) =>
    fromSyncedRow({ ...SYNCED_ROWS[0], slug, publishedAt: at })
  );

  assertEq(
    [...new Set(rows.map((row) => row.publishedAt.getTime()))].length,
    1,
    "ANCHOR FAILED: the three rows do not share a publishedAt"
  );

  const one = mergePosts([], rows).map((post) => post.slug);
  const two = mergePosts([], [...rows].reverse()).map((post) => post.slug);

  assertEq(one, ["alpha", "mu", "zeta"], "the tiebreaker is not the slug ascending");
  assertEq(one, two, "the order depends on the order the rows arrived in");

  return one.join(", ");
});

check("previous is the OLDER neighbour, at both ends, and an unknown slug has neither", () => {
  const merged = mergePosts(MDX_POSTS, []);

  assertEq(merged.map((post) => post.slug), ["hashtag", "wordleverse", "goldwater-bank"], "unexpected fixture order");

  const first = adjacentIn(merged, "hashtag");
  const middle = adjacentIn(merged, "wordleverse");
  const last = adjacentIn(merged, "goldwater-bank");

  assertEq([first.previous?.slug, first.next], ["wordleverse", null], "the newest post has a next");
  assertEq([middle.previous?.slug, middle.next?.slug], ["goldwater-bank", "hashtag"], "wrong middle neighbours");
  assertEq([last.previous, last.next?.slug], [null, "wordleverse"], "the oldest post has a previous");
  assertEq(adjacentIn(merged, "nope"), { previous: null, next: null }, "an unknown slug got neighbours");

  return "previous = older";
});

check("adjacency can walk from a synced post to an MDX one", () => {
  const merged = mergePosts(MDX_POSTS, SYNCED_ROWS.map((row) => fromSyncedRow(row)));
  const synced = merged.filter((post) => post.source === "substack");

  const crossings = synced
    .map((post) => adjacentIn(merged, post.slug))
    .filter(({ previous, next }) => previous?.source === "mdx" || next?.source === "mdx");

  assert(crossings.length > 0, "no synced post neighbours an MDX post — the two sources did not interleave");

  return `${crossings.length} crossings`;
});

// ── reading time ───────────────────────────────────────────────────────────
section("Reading time");

check("the constant and the rounding are the ones remark.mjs used", () => {
  assertEq(WORDS_PER_MINUTE, 200, "the words-per-minute constant moved");
  assertEq(minutesForWords(0), 1, "an empty post must still be a 1 minute read");
  assertEq(minutesForWords(1), 1, "a one-word post must be a 1 minute read");
  assertEq(minutesForWords(300), 2, "300 words should round to 2 minutes");
  assertEq(minutesForWords(500), 3, "500 words should round to 3 minutes");

  return "200 wpm, Math.max(1, round)";
});

check("code is excluded, exactly as the mdast walk excludes code and inlineCode", () => {
  const prose = "<p>one two three four five</p>";
  const withCode = `${prose}<pre><code>${"noise ".repeat(500)}</code></pre><p>Inline <code>ignored words here</code> too.</p>`;

  assertEq(countHtmlWords(prose), 5, "plain prose miscounted");
  assertEq(countHtmlWords(withCode), 7, "code content leaked into the word count");
  assertEq(readingTimeFromHtml(withCode), 1, "500 words of code inflated the reading time");

  return "pre and code ignored";
});

check("entities are decoded, so \"you&#39;re\" is one word and &nbsp; separates two", () => {
  assertEq(countHtmlWords("<p>you&#39;re here</p>"), 2, "an apostrophe entity split a word");
  assertEq(countHtmlWords("<p>a&nbsp;b</p>"), 2, "&nbsp; did not separate two words");
  assertEq(countHtmlWords("<p>&amp; &lt; &gt;</p>"), 3, "entity punctuation miscounted");

  return "&#39; &nbsp; &amp; &lt; &gt;";
});

check("a real synced body gets a plausible, deterministic reading time", () => {
  for (const row of SYNCED_ROWS) {
    const post = fromSyncedRow(row, { full: true });

    assertEq(post.readingTime, readingTimeFromHtml(row.contentHtml), "the shape's reading time is not the formula's");
    assert(post.readingTime >= 1, `reading time was ${post.readingTime}`);
  }

  return SYNCED_ROWS.map((row) => readingTimeFromHtml(row.contentHtml)).join(", ") + " min";
});

// ── heading ids ────────────────────────────────────────────────────────────
section("Heading ids for synced posts");

// PostBody.jsx keys its TOC entries on `h.id`, so "unique and non-empty" is a
// hard requirement, not a nicety: duplicates are a React key collision and an
// empty one is a dead `#` link.
const idsOf = (html) => [...html.matchAll(/<h2 id="([^"]*)"/g)].map((m) => m[1]);

check("every h2 in a real sanitized body gains a non-empty id", () => {
  const row = SYNCED_ROWS.find((r) => /<h2>/.test(r.contentHtml));

  assert(row, "ANCHOR FAILED: no feed-base row produces an <h2> (the sanitizer rewrites h1 to h2)");

  const html = withHeadingIds(row.contentHtml);
  const ids = idsOf(html);

  assertEq(ids.length, (row.contentHtml.match(/<h2>/g) ?? []).length, "not every h2 was given an id");
  assert(ids.every(Boolean), "an h2 got an empty id");
  assertEq(ids[0], slugifyHeading("A heading the post should not own"), "the id is not the slugified heading text");

  return ids.join(", ");
});

check("two identical headings get distinct ids", () => {
  const ids = idsOf(withHeadingIds("<h2>Same</h2><p>x</p><h2>Same</h2><h2>Same</h2>"));

  assertEq(ids, ["same", "same-2", "same-3"], "duplicate headings did not get distinct ids");
  assertEq([...new Set(ids)].length, ids.length, "the ids collide");

  return ids.join(", ");
});

check("a heading that slugifies to nothing falls back to section-<n>", () => {
  assertEq(slugifyHeading("!!! ???"), "", "ANCHOR FAILED: that text no longer slugifies to nothing");

  const ids = idsOf(withHeadingIds("<h2>Real</h2><h2>!!! ???</h2>"));

  assertEq(ids, ["real", "section-2"], "the empty heading did not get the positional fallback");

  return ids[1];
});

check("a heading containing inline markup uses its text, entities and all", () => {
  const ids = idsOf(withHeadingIds("<h2>Why <code>useEffect</code> &amp; <strong>refs</strong></h2>"));

  assertEq(ids, ["why-useeffect-refs"], "inline tags or an entity leaked into the id");

  return ids[0];
});

check("the ids are attribute-safe and slug-shaped, whatever the heading contains", () => {
  const nasty = '<h2>Quote " and &lt;script&gt; and / and \\ </h2>';
  const ids = idsOf(withHeadingIds(nasty));

  assertEq(ids.length, 1, "the hostile heading did not produce exactly one id");
  assert(/^[\p{L}\p{N}-]+$/u.test(ids[0]), `the id is not slug-shaped: ${ids[0]}`);

  return ids[0];
});

check("re-running over already-ided HTML leaves the ids alone", () => {
  // The regex matches a bare <h2> only, so a second pass is a no-op rather than
  // a second id — which is what makes fromSyncedRow safe to call twice.
  const once = withHeadingIds("<h2>Alpha</h2><h2>Beta</h2>");
  const twice = withHeadingIds(once);

  assertEq(twice, once, "a second pass rewrote the HTML");
  assertEq(idsOf(twice), ["alpha", "beta"], "the ids changed on a second pass");

  return "idempotent";
});

check("nothing but the h2 open tags is touched", () => {
  const row = SYNCED_ROWS.find((r) => /<h2>/.test(r.contentHtml));
  const html = withHeadingIds(row.contentHtml);

  assertEq(
    html.replace(/<h2 id="[^"]*">/g, "<h2>"),
    row.contentHtml,
    "withHeadingIds changed something other than the h2 open tags"
  );

  return `${html.length - row.contentHtml.length} bytes added`;
});

// ── result ─────────────────────────────────────────────────────────────────
console.log(
  failures === 0
    ? "\nAll checks passed."
    : `\n${failures} check${failures === 1 ? "" : "s"} FAILED.`
);

process.exit(failures === 0 ? 0 : 1);
