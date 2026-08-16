// "The MDX posts render exactly as they do today" — as a measurement.
//
//   node .agent/scripts/verify-blog-dom.mjs <baseUrl> <out.json> [--expect <file>] [--only a,b,c]
//
// Captures the rendered DOM of /blog and the three MDX post pages from a running
// server, writes one JSON document, and — with --expect — diffs it against a
// capture taken from an UNMODIFIED base branch and exits 1 on any difference.
// The comparison is the point: an assertion about how a post renders is a claim,
// a byte-for-byte diff against the old build is a proof.
//
// Capture the baseline from a second, clean worktree of the base branch, never
// from your own tree. A baseline taken from modified code proves nothing.
//
// The exit code is this script's own, not shot.mjs's: on `epic/substack-rss`
// shot.mjs predates #158 and exits 0 even when the page script throws, so a
// missing `result` is treated here as a failure rather than trusted.
//
// Sections are named so a LEGITIMATE change can be excluded from a comparison
// with --only (after seeding synced posts, `footer` and `cards` change on
// purpose — synced posts join the ordering — while `article`, `rail`, `title`
// and `meta` must not).
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SHOT = join(HERE, "shot.mjs");

const USAGE =
  "usage: node .agent/scripts/verify-blog-dom.mjs <baseUrl> <out.json> [--expect <file>] [--only a,b,c]";

const argv = process.argv.slice(2);
const positional = argv.filter((arg) => !arg.startsWith("--"));
const flag = (name) => {
  const at = argv.indexOf(`--${name}`);

  return at === -1 ? null : argv[at + 1];
};

const [baseUrl, out] = positional;

if (!baseUrl || !out) {
  console.error(`verify-blog-dom.mjs: missing arguments\n${USAGE}`);
  process.exit(2);
}

const expectFile = flag("expect");
const only = flag("only")?.split(",").map((s) => s.trim()).filter(Boolean) ?? null;

// The pages whose rendering must not move. /blog first: it is the one that shows
// the merged ordering.
const PAGES = ["/blog", "/blog/goldwater-bank", "/blog/hashtag", "/blog/wordleverse"];

const WIDTH = 1200;

// ── the page script ────────────────────────────────────────────────────────
// ONE EXPRESSION: shot.mjs hands the file straight to Runtime.evaluate.
//
// Nothing here reads an emotion class name as an identifier — `css-1a2b3c`
// hashes move whenever any styled component's CSS changes, so every occurrence
// is normalized to `css-*` and the structure around it is what is compared.
// `article` is captured as innerHTML, so the <article> element's own class is
// out of scope by construction.
const PAGE_SCRIPT = `(() => {
  const norm = (value) =>
    value == null ? null : String(value).replace(/css-[a-z0-9]+/g, "css-*");

  const pairs = (nodes) =>
    [...nodes].map((n) => [n.getAttribute("href"), n.textContent.trim()]);

  const article = document.querySelector("article");

  const meta = [...document.querySelectorAll("meta")]
    .map((m) => [m.getAttribute("property") ?? m.getAttribute("name"), m.getAttribute("content")])
    .filter(([key]) => key === "description" || /^(og|article):/.test(key ?? ""))
    .sort((a, b) => String(a[0]).localeCompare(String(b[0])));

  // The rail is the column that carries the reading time. Found by its text
  // rather than by a class, because the class is an emotion hash.
  const readTime = [...document.querySelectorAll("span")].find(
    (s) => s.children.length === 0 && /min read$/.test(s.textContent.trim())
  );

  // On a post page the only /blog/<slug> links are prev/next; the TOC links are
  // fragments and "Back to Blog" is /blog exactly.
  const blogLinks = document.querySelectorAll('a[href^="/blog/"]');

  const cards = article
    ? null
    : [...blogLinks].map((a) => [
        a.getAttribute("href"),
        a.querySelector("h2")?.textContent.trim() ?? null,
        a.querySelector("sup")?.parentElement?.textContent.trim() ?? null,
      ]);

  const rect = article?.getBoundingClientRect();

  return {
    title: document.title,
    meta,
    article: norm(article?.innerHTML ?? null),
    rail: readTime?.parentElement?.textContent.trim() ?? null,
    toc: article ? pairs(document.querySelectorAll("details a")) : null,
    footer: article ? pairs(blogLinks) : null,
    cards,
    metrics: rect ? { w: Math.round(rect.width), h: Math.round(rect.height) } : null,
  };
})()`;

// ── capture ────────────────────────────────────────────────────────────────
const scratch = mkdtempSync(join(tmpdir(), "verify-blog-dom-"));
const scriptPath = join(scratch, "capture.js");

writeFileSync(scriptPath, PAGE_SCRIPT);

const capture = (path) => {
  const url = `${baseUrl.replace(/\/$/, "")}${path}`;
  const shot = spawnSync(
    process.execPath,
    [SHOT, url, String(WIDTH), "-", scriptPath],
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }
  );

  if (shot.status !== 0) {
    throw new Error(`shot.mjs exited ${shot.status} for ${url}\n${shot.stderr?.trim()}`);
  }

  let payload;

  try {
    payload = JSON.parse(shot.stdout);
  } catch {
    throw new Error(`shot.mjs printed no JSON for ${url}\n${shot.stdout?.slice(0, 400)}`);
  }

  // shot.mjs on this branch predates #158 and reports a thrown page script as a
  // successful run with no `result`. Refuse it rather than record a null page.
  if (!payload.result) {
    throw new Error(`the page script returned nothing for ${url} — it threw, or the page has no content`);
  }

  const { result } = payload;

  // Anchor. A capture of a page that failed to render is all nulls, and all
  // nulls compares equal to all nulls — which is exactly how this gate could go
  // quietly useless.
  if (path === "/blog") {
    if (!result.cards?.length) throw new Error(`${url} rendered no post cards`);
  } else if (!result.article || result.article.length < 500) {
    throw new Error(`${url} rendered no <article> body (got ${result.article?.length ?? 0} chars)`);
  }

  return result;
};

const captured = {};

try {
  for (const path of PAGES) {
    process.stderr.write(`  capturing ${path}\n`);
    captured[path] = capture(path);
  }
} finally {
  rmSync(scratch, { recursive: true, force: true });
}

writeFileSync(out, JSON.stringify(captured, null, 2));
console.log(`wrote ${out} (${PAGES.length} pages)`);

if (!expectFile) process.exit(0);

// ── diff ───────────────────────────────────────────────────────────────────
const expected = JSON.parse(readFileSync(expectFile, "utf8"));
const differences = [];

const compare = (path, a, b) => {
  if (JSON.stringify(a) === JSON.stringify(b)) return;

  if (a && b && typeof a === "object" && typeof b === "object" && !Array.isArray(a) && !Array.isArray(b)) {
    for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
      compare(`${path}.${key}`, a[key], b[key]);
    }

    return;
  }

  differences.push({ path, expected: a, actual: b });
};

for (const page of PAGES) {
  const before = expected[page] ?? {};
  const after = captured[page] ?? {};
  const sections = only ?? Object.keys({ ...before, ...after });

  for (const section of sections) {
    compare(`${page}.${section}`, before[section], after[section]);
  }
}

const brief = (value) => {
  const text = JSON.stringify(value) ?? "undefined";

  return text.length > 300 ? `${text.slice(0, 300)}… (${text.length} chars)` : text;
};

console.log(
  `\ncompared ${PAGES.length} pages against ${expectFile}${only ? ` (sections: ${only.join(", ")})` : ""}`
);

if (differences.length === 0) {
  console.log("No differences.");
  process.exit(0);
}

for (const { path, expected: was, actual } of differences) {
  console.log(`\n  DIFF  ${path}\n          expected ${brief(was)}\n          actual   ${brief(actual)}`);
}

console.log(`\n${differences.length} difference${differences.length === 1 ? "" : "s"}.`);
process.exit(1);
