// "A post nobody on this side wrote still fits the page" — as a measurement.
//
//   node .agent/scripts/verify-blog-overflow.mjs <baseUrl> [--widths 1200,430] [--paths /blog/x,/blog/y]
//
// Prefix `--paths` runs with MSYS_NO_PATHCONV=1 under Git Bash, or it rewrites
// the leading slash into a Windows path and the URL fails to navigate.
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
//
// A payload is not the only thing a page can fail to carry. It can also fail to
// be the right SHAPE: the heading TOC is built by an effect after mount and only
// for an article two viewports tall, so for three verification passes every page
// this script measured had an empty left rail and the 150px track that renders a
// synced post's heading text was never laid out at all. Hence `toc-overflow`,
// hence the `tocEntries` anchor, and hence the wait — a page script that
// measures before the effect has run reports a TOC-less page as fine, which is
// the same defect as measuring a 404.
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
    // The only page here tall enough for PostBody to build a TOC, which is the
    // whole point of it: the entries are the article's own h2 text re-rendered
    // into a 150px rail, so on a synced post that rail is third-party text and
    // nothing else. Anchored on the entries EXISTING, not on the run length —
    // the run is in the article either way, and a rail that never rendered
    // would otherwise measure clean.
    path: "/blog/toc-overflow",
    anchor: (a) => a.tocEntries >= 4 && a.longestRun >= 200,
    carries: "a 4-entry TOC, one entry holding a 200-character run",
  },
  {
    // The rail's other axis. How many sections a post has is the author's
    // choice too, and a pinned box taller than the viewport does not scroll
    // with the page — the entries past the bottom edge are unreachable.
    path: "/blog/toc-tall",
    anchor: (a) => a.tocEntries >= 14,
    carries: "a 14-entry TOC",
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
// ONE EXPRESSION: shot.mjs hands the file straight to Runtime.evaluate. It may
// be an ASYNC one — shot.mjs evaluates with awaitPromise: true — which is what
// lets the TOC wait below live in the page rather than as a longer sleep in
// shot.mjs (that file is out of scope for #153 and shared with other gates).
const PAGE_SCRIPT = `(async () => {
  const round = (n) => Math.round(n);

  // PostBody's own rule, restated: it shows a TOC for an article at least
  // LONG_POST_SCREENS (2) viewports tall that has an h2, and it decides in an
  // effect after mount, then again on every ResizeObserver tick. So a page that
  // should have one may not have one YET. Waiting only when it is expected
  // costs nothing on the pages that never get one.
  const wantsToc = () => {
    const a = document.querySelector("article");

    return Boolean(
      a &&
        a.getBoundingClientRect().height >= innerHeight * 2 &&
        a.querySelector("h2")
    );
  };
  const deadline = Date.now() + 5000;

  while (wantsToc() && !document.querySelector("details a") && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 100));
  }

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

  // The rail, measured against ITSELF rather than against the viewport. A TOC
  // entry that spills is broken long before it reaches the page edge: at 1200px
  // the rail is 150px wide and ends at x=214, so a 507px entry is painted over
  // the article beside it while body.scrollWidth is still a contented 1200.
  // Only past ~145 unbreakable characters does it ALSO become a page-level
  // overflow, so nothing above can stand in for this.
  //
  // scrollWidth, not getBoundingClientRect(): the entry is a flex item of a
  // column flex container, so its BOX is stretched to the rail's 150px whatever
  // it holds — measured 150 on all four entries with the wrap rule removed,
  // while their content ran to 210, 507, 1568 and 175. A box measurement here
  // would report the bug as fine.
  const tocEl = document.querySelector("details");
  const tocLinks = [...document.querySelectorAll("details a")];
  const tocStyle = tocEl ? getComputedStyle(tocEl) : null;
  const toc = {
    entries: tocLinks.length,
    boxW: tocLinks.length ? Math.max(...tocLinks.map((a) => a.clientWidth)) : null,
    maxEntryW: tocLinks.length
      ? Math.max(...tocLinks.map((a) => a.scrollWidth))
      : null,
    // Only meaningful where the rail is pinned. Below 900px it is a collapsed
    // <details> in normal flow, and a tall list there just scrolls with the
    // page like everything else.
    sticky: tocStyle?.position === "sticky",
    h: tocEl ? round(tocEl.getBoundingClientRect().height) : null,
    // The offset it sticks at (60px, clearing the sticky nav) is the top of the
    // room it has; the viewport's bottom edge is the other end.
    room: tocStyle ? innerHeight - parseFloat(tocStyle.top || "0") : null,
  };

  return {
    toc,
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
    anchors: { longestRun, listDepth, tableColumns, tocEntries: toc.entries },
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
            `${m.anchors.listDepth}, widest row ${m.anchors.tableColumns} cells, ` +
            `${m.anchors.tocEntries} TOC entries) — seed the fixture`
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

      // The rail against itself, and the only assertion here that fails at 1200
      // on an ordinary heading rather than only on a pasted token.
      if (m.toc.maxEntryW != null && m.toc.maxEntryW > m.toc.boxW) {
        fail(
          `a TOC entry's content is ${m.toc.maxEntryW}px wide in a ${m.toc.boxW}px rail — it is painted over the article`
        );
      }

      // Same rail, other axis: pinned and taller than the room it is pinned in
      // means the entries below the fold can never be reached.
      if (m.toc.sticky && m.toc.h > m.toc.room) {
        fail(
          `the pinned TOC is ${m.toc.h}px tall with ${m.toc.room}px of room — its last entries are unreachable`
        );
      }

      rows.push(
        `  ${path} @ ${width}px  ${m.hasArticle ? "article" : "main"} ${m.article.w}x${m.article.h}  ` +
          `text ${m.paragraphMax}  body.scrollWidth ${m.body.scrollWidth}/${m.body.clientWidth}  ` +
          `widest ${m.widest?.tag} ${m.widest?.w}  overflow-wrap: ${m.article.overflowWrap}` +
          (m.toc.entries
            ? `  toc ${m.toc.entries} entries, widest content ${m.toc.maxEntryW}/${m.toc.boxW}` +
              (m.toc.sticky ? `, pinned ${m.toc.h}/${m.toc.room}` : "")
            : "")
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
