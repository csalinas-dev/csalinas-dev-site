// "A post nobody on this side wrote still fits the page" — as a measurement.
//
//   node .agent/scripts/verify-blog-overflow.mjs <baseUrl> [--widths 1200,430] [--paths /blog/x,/blog/y]
//
// Seed .agent/fixtures/substack/feed-overflow.xml first — that fixture IS the
// input to this script:
//
//   node --env-file=.env .agent/scripts/seed-substack-fixture.mjs \
//     .agent/fixtures/substack/feed-overflow.xml
//
// Why this exists as a separate gate: verify-blog-dom.mjs proves the three MDX
// posts did not move, and it can only ever prove that, because every input it
// has was written by someone here. The moment a synced body renders, the prose
// theme is handed content chosen by somebody else — a pasted credential, a
// commit hash, a hyphen-free URL, a twelve-column metrics table. All of it is
// ordinary newsletter content, all of it survives sanitize.js completely intact
// (correctly — narrowing what a visitor's own writing may contain is the wrong
// lever for a layout bug), and each one sets a min-content width larger than the
// article's grid track.
//
// The failure that lets through is not "one line overflows". The <article>
// element itself inflates to the width of its widest unbreakable thing, so
// EVERY paragraph of the post is laid out wider than the viewport and <body> —
// this site's scroll container — scrolls sideways. Hence the three assertions
// below: the scroll container, the article box, and an ordinary paragraph.
//
// 430px is a phone; 1200px is where the two-column grid is live and a wide table
// still does not fit the 1fr track. Both, always: the 430 case is invisible at
// 1200 and the table case is invisible at 430 (the table is narrower than a
// phone is wide only in the sense that nothing is).
//
// Each page ANCHORS on the payload it is supposed to carry, measured off the
// rendered DOM rather than trusted: a page that failed to seed has no long run,
// no deep list and no wide table, and every geometry assertion below would pass
// on it for the wrong reason.
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SHOT = join(HERE, "shot.mjs");

const USAGE =
  "usage: node .agent/scripts/verify-blog-overflow.mjs <baseUrl> [--widths 1200,430] [--paths /blog/a,/blog/b]";

const argv = process.argv.slice(2);
const flag = (name) => {
  const at = argv.indexOf(`--${name}`);

  return at === -1 ? null : argv[at + 1];
};
// Flag VALUES are not positionals. (`--paths /blog/x http://host` must not read
// the path list as the base URL.)
const flagged = new Set();

for (const name of ["widths", "paths"]) {
  const at = argv.indexOf(`--${name}`);

  if (at !== -1) flagged.add(at + 1);
}

const [baseUrl] = argv.filter((arg, i) => !arg.startsWith("--") && !flagged.has(i));

if (!baseUrl) {
  console.error(`verify-blog-overflow.mjs: missing <baseUrl>\n${USAGE}`);
  process.exit(2);
}

const widths = (flag("widths") ?? "1200,430")
  .split(",")
  .map((w) => Number(w.trim()))
  .filter((w) => Number.isFinite(w) && w > 0);

// One page per shape, plus an MDX post as the control: whatever the numbers say
// about a synced body, `/blog/hashtag` is what "fine" looks like on this build.
// `anchor` names what the page must be carrying for its measurement to mean
// anything.
const DEFAULT_PAGES = [
  {
    path: "/blog",
    anchor: (a) => a.longestRun >= 63,
    carries: "a card whose title holds a 63-character run",
  },
  {
    path: "/blog/unbreakable-token",
    anchor: (a) => a.longestRun >= 63,
    carries: "a 63-character unbreakable run",
  },
  {
    path: "/blog/long-identifiers",
    anchor: (a) => a.longestRun >= 108,
    carries: "a 110-character hex identifier",
  },
  {
    path: "/blog/wide-table",
    anchor: (a) => a.tableColumns >= 12,
    carries: "a 12-column table",
  },
  {
    path: "/blog/deep-nesting",
    anchor: (a) => a.listDepth >= 40,
    carries: "a 40-deep nested list",
  },
  {
    // Title and subtitle are third-party text as well, rendered by the shell
    // rather than by the article.
    path: "/blog/unbreakable-title",
    anchor: (a) => a.longestRun >= 63,
    carries: "a 63-character run in its title",
  },
  {
    path: "/blog/hashtag",
    anchor: (a) => a.longestRun > 0,
    carries: "the MDX control post",
  },
];

const pages = flag("paths")
  ? flag("paths")
      .split(",")
      .map((path) => ({ path: path.trim(), anchor: () => true, carries: "(unchecked)" }))
      .filter(({ path }) => path)
  : DEFAULT_PAGES;

// ── the page script ────────────────────────────────────────────────────────
// ONE EXPRESSION: shot.mjs hands the file straight to Runtime.evaluate.
const PAGE_SCRIPT = `(() => {
  const round = (n) => Math.round(n);
  const article = document.querySelector("article");
  // Measured over the whole page, not just the article: the listing has no
  // <article> at all, and on a post page the title and the subtitle are
  // third-party text that lives OUTSIDE it. Scoping to the article is how a
  // 63-character run in a title goes unnoticed.
  const root = document.querySelector("main") ?? document.body;

  if (!root) return null;

  const rect = (article ?? root).getBoundingClientRect();
  const body = document.body;

  // Something wider than the viewport is only a problem if it ESCAPES: a <pre>
  // or a <table> that scrolls inside itself, or a list clipped by the article,
  // is contained, and the page around it is unaffected. So anything with a
  // clipping or scrolling ancestor below the root is excluded here rather than
  // counted as an overflow.
  const contained = (el) => {
    for (let node = el.parentElement; node && node !== root; node = node.parentElement) {
      if (getComputedStyle(node).overflowX !== "visible") return true;
    }

    return false;
  };

  let widest = null;

  for (const el of root.querySelectorAll("*")) {
    if (contained(el)) continue;

    const w = el.getBoundingClientRect().width;

    if (!widest || w > widest.w) widest = { tag: el.tagName.toLowerCase(), w: round(w) };
  }

  // Text blocks: a paragraph, a heading or a card title has nowhere to go, so
  // its laid-out width is the reader's experience of the page.
  const paragraphs = [...root.querySelectorAll("p, h1, h2, h3")]
    .filter((p) => !contained(p))
    .map((p) => round(p.getBoundingClientRect().width));

  const listDepth = [...root.querySelectorAll("ul, ol")].reduce((deepest, list) => {
    let depth = 0;

    for (let node = list; node && node !== root; node = node.parentElement) {
      if (node.tagName === "UL" || node.tagName === "OL") depth += 1;
    }

    return Math.max(deepest, depth);
  }, 0);

  const tableColumns = [...root.querySelectorAll("tr")].reduce(
    (widest, row) => Math.max(widest, row.children.length),
    0
  );

  // innerText, not textContent: textContent includes the contents of <script>,
  // and Next's inline hydration JSON is one 6000-character "word" — which would
  // satisfy every "does this page carry a long run?" anchor on any page at all,
  // including a 404.
  const longestRun = (root.innerText ?? "")
    .split(/\\s+/)
    .reduce((longest, run) => Math.max(longest, run.length), 0);

  return {
    viewport: { w: innerWidth, h: innerHeight },
    body: { scrollWidth: body.scrollWidth, clientWidth: body.clientWidth },
    doc: {
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    },
    hasArticle: Boolean(article),
    article: {
      w: round(rect.width),
      h: round(rect.height),
      overflowWrap: getComputedStyle(article ?? root).overflowWrap,
    },
    widest,
    paragraphMax: paragraphs.length ? Math.max(...paragraphs) : null,
    anchors: { longestRun, listDepth, tableColumns },
  };
})()`;

// ── capture ────────────────────────────────────────────────────────────────
const scratch = mkdtempSync(join(tmpdir(), "verify-blog-overflow-"));
const scriptPath = join(scratch, "measure.js");

writeFileSync(scriptPath, PAGE_SCRIPT);

const measure = (path, width) => {
  const url = `${baseUrl.replace(/\/$/, "")}${path}`;
  const shot = spawnSync(
    process.execPath,
    [SHOT, url, String(width), "-", scriptPath],
    { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 }
  );

  if (shot.status !== 0) {
    throw new Error(`shot.mjs exited ${shot.status} for ${url} @ ${width}\n${shot.stderr?.trim()}`);
  }

  let payload;

  try {
    payload = JSON.parse(shot.stdout);
  } catch {
    throw new Error(`shot.mjs printed no JSON for ${url} @ ${width}\n${shot.stdout?.slice(0, 400)}`);
  }

  if (!payload.result) {
    throw new Error(`the page script returned nothing for ${url} @ ${width}`);
  }

  return payload.result;
};

const failures = [];
const rows = [];

try {
  for (const { path, anchor, carries } of pages) {
    for (const width of widths) {
      const m = measure(path, width);
      const fail = (why) => failures.push(`${path} @ ${width}px — ${why}`);

      // Anchor first: everything below is a claim about a page that is carrying
      // the payload, and an unseeded page carries nothing. A post URL with no
      // row behind it is a 404 — which lays out perfectly, at every width.
      if (path !== "/blog" && !m.hasArticle) {
        fail("rendered no <article> — the post 404'd; seed the fixture");
      }

      if (!anchor(m.anchors)) {
        fail(
          `does not carry ${carries} (longest run ${m.anchors.longestRun}, list depth ` +
            `${m.anchors.listDepth}, widest row ${m.anchors.tableColumns} cells) — seed the fixture`
        );
      }

      if (m.viewport.w !== width) fail(`laid out at ${m.viewport.w}px, not ${width}px`);

      // body is the scroll container (globals.css: height 100svh, overflow-y
      // auto), so this is the one that decides whether the reader has to pan.
      if (m.body.scrollWidth > m.body.clientWidth) {
        fail(`body scrolls sideways: scrollWidth ${m.body.scrollWidth} > clientWidth ${m.body.clientWidth}`);
      }

      if (m.hasArticle && m.article.w > m.body.clientWidth) {
        fail(`article inflated to ${m.article.w}px inside a ${m.body.clientWidth}px page`);
      }

      if (m.paragraphMax != null && m.paragraphMax > m.viewport.w) {
        fail(
          `an ordinary text block is ${m.paragraphMax}px wide in a ${m.viewport.w}px viewport`
        );
      }

      // Nothing that is not contained by a scrolling or clipping ancestor may be
      // laid out wider than the viewport.
      if (m.widest && m.widest.w > m.viewport.w) {
        fail(`a <${m.widest.tag}> escapes: laid out ${m.widest.w}px wide in a ${m.viewport.w}px viewport`);
      }

      rows.push(
        `  ${path} @ ${width}px  ${m.hasArticle ? "article" : "main"} ${m.article.w}x${m.article.h}  ` +
          `text ${m.paragraphMax}  body.scrollWidth ${m.body.scrollWidth}/${m.body.clientWidth}  ` +
          `widest ${m.widest?.tag} ${m.widest?.w}  overflow-wrap: ${m.article.overflowWrap}`
      );
    }
  }
} finally {
  rmSync(scratch, { recursive: true, force: true });
}

console.log(`measured ${pages.length} pages at ${widths.join("px, ")}px\n`);
console.log(rows.join("\n"));

if (failures.length === 0) {
  console.log("\nNo page overflows its viewport.");
  process.exit(0);
}

console.log("");

for (const failure of failures) console.log(`  FAIL  ${failure}`);

console.log(`\n${failures.length} failure${failures.length === 1 ? "" : "s"}.`);
process.exit(1);
