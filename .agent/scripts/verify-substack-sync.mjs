// Verification harness for Substack ingestion (src/lib/substack).
//
//   node .agent/scripts/verify-substack-sync.mjs
//
// This repo has no test runner — `package.json` has only dev/build/start/lint —
// so the module's checks are this script. It imports the real modules (via the
// resolve hook in ./lib/esm-resolver.mjs, which teaches bare Node the repo's
// extensionless imports), prints one line per check, and exits non-zero if any
// of them fail.
//
// NO NETWORK AND NO DATABASE. `readFeed` returns fixture text from
// .agent/fixtures/substack, and `store` is an in-memory Map that COUNTS its
// create/update calls — so "running the sync twice writes nothing" is proven by
// a counter rather than asserted by a comment. The in-memory store also throws
// if an update patch ever contains a slug, which is a tripwire for the one
// regression this module most fears.
//
// Every check ANCHORS first: it asserts the fixture really contains the thing
// being probed before asserting the pipeline's answer. Without that, "the
// fixture silently stopped containing an iframe" reads as a pass, which is the
// one way a script like this can go quietly useless.
import { register } from "node:module";
import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join, relative } from "node:path";

// The module's files are `.js` under a package.json with no `"type"`, so Node
// reparses each one as ESM and warns about it once per file. That is expected
// here and could only be "fixed" by declaring the whole Next.js app a module, so
// re-exec once with that ONE warning code disabled — not `--no-warnings`, which
// would hide the next real one too. The loader emits it off the main thread, so
// a `process.on("warning")` filter does not catch it.
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
const MODULE_DIR = join(ROOT, "src/lib/substack");

const load = (file) => import(pathToFileURL(join(MODULE_DIR, file)).href);

const { parseFeedXml } = await load("feed.js");
const { sanitizePostHtml, sanitizeText } = await load("sanitize.js");
const { normalizeItem } = await load("normalize.js");
const { syncSubstackPosts } = await load("sync.js");

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

// Async twin of `check`. The sync itself is async, so most checks need this.
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
    eq(actual, expected),
    `${message}\n          expected ${JSON.stringify(expected)}\n          got      ${JSON.stringify(actual)}`
  );

const section = (title) => console.log(`\n${title}`);

// ── fixtures ───────────────────────────────────────────────────────────────
const fixture = (name) => readFileSync(join(FIXTURES, `${name}.xml`), "utf8");

// Fixture comments explain what each file proves, so they naturally quote the
// very tags and phrases the anchors look for. Anchor against the payload only,
// or a comment saying "this file has no <item>" reads as an <item>.
const payload = (xml) => xml.replace(/<!--[\s\S]*?-->/g, "");

// The anchor helper. Every probe states, in the check itself, what the fixture
// has to contain for the probe to mean anything.
const anchor = (name, needle) =>
  assert(
    payload(fixture(name)).includes(needle),
    `ANCHOR FAILED: ${name}.xml no longer contains ${JSON.stringify(needle)} — this check would have passed vacuously`
  );

// ── the injected store ─────────────────────────────────────────────────────
// A Map with a write counter. `writes` is what makes "the second run is a no-op"
// a measurement instead of a claim.
const p2002 = (field) => Object.assign(new Error("Unique constraint failed"), {
  code: "P2002",
  meta: { target: [`SubstackPost_${field}_key`] },
});

const makeStore = () => {
  const rows = new Map();
  const calls = { findBySourceIds: 0, findBySlug: 0, create: 0, update: 0 };

  return {
    rows,
    calls,
    get writes() {
      return calls.create + calls.update;
    },
    async findBySourceIds(ids) {
      calls.findBySourceIds += 1;

      // Exactly the three columns the Prisma adapter selects, so a sync that
      // starts relying on a fourth fails here rather than in production.
      return ids
        .map((id) => rows.get(id))
        .filter(Boolean)
        .map(({ sourceId, slug, contentHash }) => ({ sourceId, slug, contentHash }));
    },
    async findBySlug(slug) {
      calls.findBySlug += 1;

      const hit = [...rows.values()].find((row) => row.slug === slug);

      return hit ? { sourceId: hit.sourceId } : null;
    },
    async create(record) {
      calls.create += 1;

      if (rows.has(record.sourceId)) throw p2002("sourceId");
      if ([...rows.values()].some((row) => row.slug === record.slug)) throw p2002("slug");

      rows.set(record.sourceId, { ...record, syncedAt: new Date() });
    },
    async update(sourceId, patch) {
      calls.update += 1;

      // TRIPWIRE. The slug is assigned once at insert and must never appear in
      // an update patch; `update: { ...post }` is the natural-looking mistake
      // that would rewrite it and break every inbound link on a title edit.
      assert(!("slug" in patch), "update patch contained a slug — the slug is frozen at insert");
      assert(rows.has(sourceId), `update for unknown sourceId ${sourceId}`);

      rows.set(sourceId, { ...rows.get(sourceId), ...patch, syncedAt: new Date() });
    },
  };
};

const FEED_URL = "https://fixture.substack.com/feed";
const CLOCK = () => new Date("2026-08-15T12:00:00.000Z");

const sync = (name, store) =>
  syncSubstackPosts({ feedUrl: FEED_URL, readFeed: async () => fixture(name), store, now: CLOCK });

// ── parsing and normalization ──────────────────────────────────────────────
section("Parsing and normalization");

check("feed-base yields 3 items and reads the id through its attribute wrapper", () => {
  // The id tag carries an attribute, so the parser hands back
  // `{ "#text": …, "@_isPermaLink": … }` rather than a string.
  anchor("feed-base", 'isPermaLink="false">https://fixture.substack.com/p/first-post<');

  const { items } = parseFeedXml(fixture("feed-base"));

  assertEq(items.length, 3, "wrong item count");
  assertEq(
    items[0].id,
    "https://fixture.substack.com/p/first-post",
    "the id came back as the {'#text': …} wrapper instead of its text"
  );

  return "3 items";
});

check("a single-item feed yields exactly 1 item, not a crash and not 0", () => {
  const xml = fixture("feed-single-item");

  // The whole point of the fixture. If a second item is ever added the array
  // path takes over and this check silently stops testing anything.
  assert(
    (payload(xml).match(/<item>/g) ?? []).length === 1,
    "ANCHOR FAILED: feed-single-item.xml no longer has exactly one item"
  );

  const { items } = parseFeedXml(xml);

  assertEq(items.length, 1, "channel.item was not normalized from a bare object to an array");
  assertEq(items[0].title, "The Only Post", "the single item lost its title");

  return "1 item";
});

check("a zero-item feed yields 0 items rather than throwing", () => {
  assert(!payload(fixture("feed-empty")).includes("<item>"), "ANCHOR FAILED: feed-empty.xml has gained an item");

  assertEq(parseFeedXml(fixture("feed-empty")).items.length, 0, "an empty channel did not yield zero items");

  return "0 items";
});

check("a numeric title and id survive as strings (parseTagValue: false)", () => {
  anchor("feed-base", "<title><![CDATA[2026]]></title>");

  const { items } = parseFeedXml(fixture("feed-base"));
  const numeric = items.find((item) => item.title === "2026");

  assert(numeric, "the numeric-titled item is missing");
  assertEq(typeof numeric.title, "string", "a numeric title was parsed as a Number");
  assertEq(typeof numeric.id, "string", "a numeric-looking id was parsed as a Number");

  return "typeof title === 'string'";
});

check("numeric titles keep their exact text — no silent coercion damage", () => {
  // "2026" survives String(Number("2026")) unharmed, so it cannot catch a
  // number-coercing parser on its own. A leading or trailing zero can.
  anchor("feed-numeric", "<title><![CDATA[007]]></title>");
  anchor("feed-numeric", "<title><![CDATA[1.50]]></title>");

  const titles = parseFeedXml(fixture("feed-numeric")).items.map((item) => item.title);

  assertEq(titles, ["007", "1.50"], "a numeric-looking title was coerced through Number and lost digits");

  return titles.join(", ");
});

check("the slug comes from the /p/<slug> segment and is stable across two runs", () => {
  anchor("feed-base", "https://fixture.substack.com/p/no-enclosure");

  const { items } = parseFeedXml(fixture("feed-base"));
  const once = items.map((item) => normalizeItem(item).post.slug);
  const twice = parseFeedXml(fixture("feed-base")).items.map((item) => normalizeItem(item).post.slug);

  assertEq(once, ["first-post", "2026", "no-enclosure"], "slugs were not taken from the /p/ segment");
  assertEq(once, twice, "slug derivation is not deterministic");

  return once.join(", ");
});

check("an unparseable publication date skips the item — it is never dated now()", () => {
  anchor("feed-degenerate", ">whenever, honestly<");

  const item = parseFeedXml(fixture("feed-degenerate")).items.find((raw) => raw.published === "whenever, honestly");
  const result = normalizeItem(item);

  assertEq(result.ok, false, "an item with a garbage publication date was accepted");
  assert(/publication date/.test(result.reason), `unexpected reason: ${result.reason}`);

  return result.reason;
});

check("an item with no content, or with a body the sanitizer empties, is skipped", () => {
  anchor("feed-degenerate", "<content:encoded></content:encoded>");
  anchor("feed-degenerate", "<script>alert(1)</script><style>p{color:red}</style>");

  const items = parseFeedXml(fixture("feed-degenerate")).items;
  const empty = normalizeItem(items.find((raw) => raw.title === "Empty Body"));
  const chrome = normalizeItem(items.find((raw) => raw.title === "Body Is All Chrome"));

  assertEq(empty.ok, false, "an item with an empty body was accepted");
  assertEq(chrome.ok, false, "an item whose body sanitized to nothing was accepted");

  return "both skipped";
});

check("an item with neither a stable id nor a link is skipped", () => {
  const items = parseFeedXml(fixture("feed-degenerate")).items;
  const orphan = items.find((raw) => raw.title === "No Identity");

  assert(orphan, "ANCHOR FAILED: feed-degenerate.xml has lost its identity-less item");
  assert(!orphan.id && !orphan.link, "ANCHOR FAILED: that item has gained an id or a link");

  assertEq(normalizeItem(orphan).ok, false, "an item with no identity was accepted");

  return "skipped";
});

check("the cover image comes from <enclosure>, and falls back to the first <img>", () => {
  anchor("feed-base", '<enclosure url="https://substackcdn.com/image/fetch/first-cover.jpg"');

  const items = parseFeedXml(fixture("feed-base")).items;
  const withEnclosure = normalizeItem(items[0]).post;
  const withoutEnclosure = normalizeItem(items[2]).post;

  assert(!items[2].mediaUrl, "ANCHOR FAILED: the third item has gained attached media");

  assertEq(
    withEnclosure.coverImage,
    "https://substackcdn.com/image/fetch/first-cover.jpg",
    "the enclosure was not used as the cover"
  );
  assertEq(
    withoutEnclosure.coverImage,
    "https://substackcdn.com/image/fetch/third-inline.jpg",
    "the cover did not fall back to the first sanitized <img>"
  );

  return "enclosure, then first <img>";
});

check("a non-image or non-absolute enclosure never becomes a cover", () => {
  anchor("feed-hostile", '<enclosure url="javascript:alert(1)"');

  const [item] = parseFeedXml(fixture("feed-hostile")).items;
  const { post } = normalizeItem(item);

  assert(
    post.coverImage === null || post.coverImage.startsWith("https://"),
    `a javascript: enclosure reached coverImage: ${post.coverImage}`
  );

  return `coverImage = ${post.coverImage}`;
});

check("sanitizeText decodes &amp; but never produces a raw < or >", () => {
  assertEq(sanitizeText("Rock &amp; Roll"), "Rock & Roll", "an escaped ampersand was not decoded");
  assertEq(sanitizeText("Rock & Roll"), "Rock & Roll", "a literal ampersand was left double-escaped");
  assertEq(sanitizeText("<b>bold</b> text"), "bold text", "tags were not stripped");

  for (const hostile of ["<script>alert(1)</script>x", "&lt;script&gt;alert(1)&lt;/script&gt;x", "&amp;lt;img&amp;gt;"]) {
    const out = sanitizeText(hostile);

    assert(!out.includes("<") && !out.includes(">"), `sanitizeText emitted an angle bracket: ${out}`);
  }

  assertEq(sanitizeText("abcdef", { maxLength: 3 }), "abc", "maxLength was not applied");

  return "no angle brackets survive";
});

// ── the module boundary ────────────────────────────────────────────────────
section("Module boundary");

check("RSS field names appear only in feed.js", () => {
  const forbidden = ["content:encoded", "dc:creator", "enclosure", "pubDate", "guid", "@_"];
  const offenders = [];

  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);

      if (statSync(path).isDirectory()) {
        walk(path);
        continue;
      }

      if (!/\.(js|jsx)$/.test(entry)) continue;
      if (path === join(MODULE_DIR, "feed.js")) continue;

      const source = readFileSync(path, "utf8");

      for (const name of forbidden) {
        if (source.includes(name)) offenders.push(`${relative(ROOT, path)} mentions ${name}`);
      }
    }
  };

  walk(join(ROOT, "src"));

  // Anchor: the names really are in feed.js, so an empty offender list means
  // "nothing else knows about RSS" rather than "the list of names is stale".
  const feed = readFileSync(join(MODULE_DIR, "feed.js"), "utf8");

  for (const name of forbidden) {
    assert(feed.includes(name), `ANCHOR FAILED: feed.js no longer mentions ${name}`);
  }

  assertEq(offenders, [], "RSS field names leaked outside feed.js");

  return `${forbidden.length} names, feed.js only`;
});

// ── sanitization: the security battery ─────────────────────────────────────
section("Sanitization — attack battery");

const PAYLOADS = [
  ["plain script", "<script>alert(1)</script>"],
  ["event handler on an allowed tag", '<img src="https://x.example/y.png" onerror="alert(1)">'],
  ["event handler on a paragraph", '<p onmouseover="alert(1)">hi</p>'],
  ["javascript: href", '<a href="javascript:alert(1)">x</a>'],
  ["javascript: href, mixed case", '<a href="JaVaScRiPt:alert(1)">x</a>'],
  ["javascript: href, leading space", '<a href="  javascript:alert(1)">x</a>'],
  ["javascript: href, tab entity", '<a href="java&#9;script:alert(1)">x</a>'],
  ["javascript: href, zero-padded entity", '<a href="&#0000106;avascript:alert(1)">x</a>'],
  ["data:text/html img", '<img src="data:text/html;base64,PHNjcmlwdD4=">'],
  ["data:text/html href", '<a href="data:text/html,<script>alert(1)</script>">x</a>'],
  ["protocol-relative href", '<a href="//evil.example/x">x</a>'],
  ["root-relative href", '<a href="/admin/delete">x</a>'],
  ["relative img src", '<img src="x">'],
  ["CVE-2026-44990 <xmp> raw text", "<xmp><script>alert(1)</script></xmp>"],
  ["2.17.6 mXSS via <textarea/>", "<textarea/><script>alert(1)</script>"],
  ["2.17.6 mXSS via </textarea/>", "<textarea></textarea/><img src=x onerror=alert(1)>"],
  ["2.17.7 SVG animate href", '<svg><a><animate attributeName="href" values="javascript:alert(1)"/></a></svg>'],
  ["CVE-2026-53606 action/formaction", '<form action="javascript:alert(1)"><button formaction="javascript:alert(1)">go</button></form>'],
  ["CVE-2026-53606 object/embed", '<object data="javascript:alert(1)"></object><embed src="javascript:alert(1)">'],
  ["style with a javascript: url", '<style>body{background:url("javascript:alert(1)")}</style><p>after</p>'],
  ["iframe srcdoc", '<iframe srcdoc="<script>alert(1)</script>"></iframe>'],
  ["meta refresh", '<meta http-equiv="refresh" content="0;url=https://evil.example">'],
  ["base href", '<base href="https://evil.example/">'],
  ["comment-wrapped img", "<!--<img src=x onerror=alert(1)>--><p>ok</p>"],
  ["noscript attribute breakout", '<noscript><p title="</noscript><img src=x onerror=alert(1)>"></noscript>'],
];

// Entity-decodes far enough to catch a scheme hidden behind character
// references, so "&#0000106;avascript:" cannot pass by looking unlike
// "javascript:".
const decodeEntities = (value) =>
  value
    .replace(/&#x([0-9a-f]+);?/gi, (unused, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);?/g, (unused, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&amp;/gi, "&");

const assertClean = (html, label) => {
  assert(
    !/<\s*\/?\s*(script|iframe|svg|object|embed|form|button|style|xmp|textarea|meta|base|h1|noscript|template|math)\b/i.test(html),
    `${label}: a forbidden tag survived — ${html}`
  );
  assert(!/\son[a-z]+\s*=/i.test(html), `${label}: an event handler attribute survived — ${html}`);

  // Browsers strip whitespace and control characters out of URLs, so collapse
  // them before looking for a scheme: "java&#9;script:" must not read as clean.
  const decoded = decodeEntities(html).replace(/[\s\u0000-\u001f]/g, "");

  assert(!/javascript:/i.test(decoded), `${label}: a javascript: scheme survived — ${html}`);
  assert(!/data:text\/html/i.test(decoded), `${label}: a data:text/html URL survived — ${html}`);

  for (const [, url] of html.matchAll(/\b(?:href|src|srcset)="([^"]*)"/gi)) {
    assert(
      /^(https?:|mailto:)/i.test(url.trim()),
      `${label}: a non-http(s)/mailto URL survived — ${JSON.stringify(url)}`
    );
  }
};

for (const [label, payload] of PAYLOADS) {
  check(`neutralized: ${label}`, () => {
    const { html } = sanitizePostHtml(payload);

    assertClean(html, label);

    return html === "" ? "removed entirely" : `→ ${html.slice(0, 60)}`;
  });
}

section("Sanitization — the sanitizer is not just deleting everything");

check("an https link survives and carries rel and target", () => {
  const { html } = sanitizePostHtml('<a href="https://ok.example/a" class="x">good</a>');

  assert(html.includes('href="https://ok.example/a"'), `href was dropped: ${html}`);
  // allowedAttributes runs AFTER transformTags, so rel/target vanish unless
  // they are also allowlisted. The symptom is invisible; this is the check.
  assert(html.includes('rel="noopener noreferrer nofollow ugc"'), `rel was stripped: ${html}`);
  assert(html.includes('target="_blank"'), `target was stripped: ${html}`);
  assert(html.includes(">good<"), `the link text was lost: ${html}`);
  assert(!html.includes("class="), `class survived: ${html}`);

  return html;
});

check("a mailto: link survives", () => {
  const { html } = sanitizePostHtml('<a href="mailto:hello@example.com">mail</a>');

  assert(html.includes('href="mailto:hello@example.com"'), `mailto was dropped: ${html}`);

  return html;
});

check("an unusable href keeps the link text and drops only the attribute", () => {
  const { html } = sanitizePostHtml('<a href="/admin">important words</a>');

  assert(html.includes("important words"), `the sentence lost its words: ${html}`);
  assert(!html.includes("href"), `the relative href survived: ${html}`);

  return html;
});

check("<h1> becomes <h2>", () => {
  const { html } = sanitizePostHtml("<h1>Title</h1>");

  assertEq(html, "<h2>Title</h2>", "h1 was not demoted");

  return html;
});

check("a figure/picture/img block survives with loading=lazy", () => {
  const { html, imagesDropped } = sanitizePostHtml(
    '<figure><picture><source srcset="https://c.example/x.png 1x"><img src="https://c.example/x.png" alt="a" class="z" data-attrs="{}"></picture><figcaption>cap</figcaption></figure>'
  );

  assert(html.includes("<figure>") && html.includes("<figcaption>"), `the figure was lost: ${html}`);
  assert(html.includes('src="https://c.example/x.png"'), `the image was lost: ${html}`);
  assert(html.includes('loading="lazy"'), `loading=lazy was not forced: ${html}`);
  assert(html.includes('alt="a"'), `alt was lost: ${html}`);
  assertEq(imagesDropped, 0, "a valid image was counted as dropped");

  return "figure/picture/img intact";
});

check("the CONTENTS of raw-text elements are discarded, not surfaced as prose", () => {
  // sanitize-html 2.17.7 already refuses to let markup escape <xmp>/<textarea>
  // (that is CVE-2026-44990 and the 2.17.6 mXSS), so the payload battery above
  // stays clean even with those tags off `nonTextTags`. What changes is that
  // their TEXT leaks into the article as visible prose. Listing them is
  // defence in depth against a future regression; this check is what holds the
  // listing in place.
  const { html } = sanitizePostHtml(
    "<xmp>XMPLEAK</xmp><textarea>TEXTAREALEAK</textarea><noscript>NOSCRIPTLEAK</noscript><p>keep me</p>"
  );

  assert(!html.includes("XMPLEAK"), `<xmp> contents leaked into the article: ${html}`);
  assert(!html.includes("TEXTAREALEAK"), `<textarea> contents leaked into the article: ${html}`);
  assert(!html.includes("NOSCRIPTLEAK"), `<noscript> contents leaked into the article: ${html}`);
  assert(html.includes("keep me"), `the surrounding prose was eaten too: ${html}`);

  return html;
});

check("div and span are discarded but their text is kept", () => {
  const { html } = sanitizePostHtml('<div class="footnote"><span style="color:red">inner</span></div>');

  assertEq(html, "inner", "layout scaffolding survived or its text was eaten");

  return html;
});

// ── the sanitizer against real-shaped feed content ─────────────────────────
section("Sanitization — real-shaped fixture bodies");

check("no class=, style=, data-*, on*= or <iframe survives feed-base", () => {
  const base = fixture("feed-base");

  for (const needle of ['class="captioned-image-container"', 'data-attrs="{}"', "<iframe", "<div", "<span"]) {
    assert(base.includes(needle), `ANCHOR FAILED: feed-base.xml no longer contains ${needle}`);
  }

  const bodies = parseFeedXml(base).items.map((item) => sanitizePostHtml(item.contentEncoded).html);

  for (const html of bodies) {
    assert(!/\sclass=/i.test(html), `class survived: ${html}`);
    assert(!/\sstyle=/i.test(html), `style survived: ${html}`);
    assert(!/\sdata-[a-z-]+=/i.test(html), `a data-* attribute survived: ${html}`);
    assert(!/\son[a-z]+\s*=/i.test(html), `an event handler survived: ${html}`);
    assert(!/<iframe/i.test(html), `an iframe survived: ${html}`);
    assert(!/<div|<span/i.test(html), `layout scaffolding survived: ${html}`);
    assertClean(html, "feed-base body");
  }

  return `${bodies.length} bodies clean`;
});

check("every payload in feed-hostile is neutralized after the XML round-trip", () => {
  // Different from the string battery above: the XML parser decodes entities
  // before the sanitizer sees the markup, so anything that REASSEMBLES during
  // that decode only shows up here.
  const xml = fixture("feed-hostile");

  assert(xml.includes("&lt;script&gt;alert(1)&lt;/script&gt;"), "ANCHOR FAILED: feed-hostile.xml lost its script payload");
  assert(xml.includes("&lt;xmp&gt;"), "ANCHOR FAILED: feed-hostile.xml lost its <xmp> payload");
  assert(xml.includes("animate attributeName"), "ANCHOR FAILED: feed-hostile.xml lost its SVG animate payload");

  const [item] = parseFeedXml(xml).items;

  assert(item.contentEncoded.includes("<script>"), "the parser did not decode the payload into real markup");

  const { html } = sanitizePostHtml(item.contentEncoded);

  assertClean(html, "feed-hostile body");
  assert(html.includes("survivor"), `the sanitizer ate the legitimate paragraph too: ${html}`);

  const { post } = normalizeItem(item);

  assert(!/[<>]/.test(post.title), `the title kept an angle bracket: ${post.title}`);
  assert(!/[<>]/.test(post.description ?? ""), `the description kept an angle bracket: ${post.description}`);
  assert(!/[<>]/.test(post.author ?? ""), `the author kept an angle bracket: ${post.author}`);

  return "clean";
});

// ── embed policy ───────────────────────────────────────────────────────────
section("Embed policy");

await checkAsync("a YouTube iframe becomes a labelled link and increments embedsRemoved", async () => {
  anchor("feed-base", '<iframe src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"');

  const store = makeStore();
  const report = await sync("feed-base", store);
  const entry = report.posts.find((post) => post.sourceId === "https://fixture.substack.com/p/first-post");

  assertEq(entry.embedsRemoved, 1, "the removed embed was not reported");

  const { contentHtml } = store.rows.get("https://fixture.substack.com/p/first-post");

  assert(
    contentHtml.includes(
      '<a href="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ" rel="noopener noreferrer nofollow ugc" target="_blank">Embedded content on www.youtube-nocookie.com</a>'
    ),
    `the iframe was not replaced by a labelled link: ${contentHtml}`
  );

  return "iframe → labelled <a>";
});

check("no <iframe survives any fixture", () => {
  const names = readdirSync(FIXTURES).filter((file) => file.endsWith(".xml"));
  let seen = 0;

  for (const file of names) {
    const xml = readFileSync(join(FIXTURES, file), "utf8");

    let items;

    try {
      items = parseFeedXml(xml).items;
    } catch {
      continue; // feed-malformed, by design
    }

    for (const item of items) {
      if (/<iframe/i.test(item.contentEncoded ?? "")) seen += 1;

      assert(!/<iframe/i.test(sanitizePostHtml(item.contentEncoded).html), `an iframe survived in ${file}`);
    }
  }

  assert(seen > 0, "ANCHOR FAILED: no fixture contains an iframe any more, so this proved nothing");

  return `${seen} iframes removed across ${names.length} fixtures`;
});

// ── idempotence ────────────────────────────────────────────────────────────
section("Idempotence");

await checkAsync("first sync of feed-base creates 3 rows", async () => {
  const store = makeStore();
  const report = await sync("feed-base", store);

  assertEq(report.ok, true, `the run failed: ${JSON.stringify(report.errors)}`);
  assertEq([report.created, report.updated, report.unchanged], [3, 0, 0], "wrong action counts");
  assertEq(store.rows.size, 3, "wrong row count");
  assertEq(store.calls.create, 3, "wrong create count");

  return "created 3";
});

await checkAsync("the SECOND sync of the same feed performs zero writes", async () => {
  const store = makeStore();

  await sync("feed-base", store);

  const writesAfterFirst = store.writes;
  const report = await sync("feed-base", store);

  assert(writesAfterFirst > 0, "ANCHOR FAILED: the first sync wrote nothing, so 'no further writes' is meaningless");
  assertEq([report.created, report.updated, report.unchanged], [0, 0, 3], "the second run did not report all-unchanged");
  assertEq(store.writes, writesAfterFirst, "the second run wrote to the store");
  assertEq(store.rows.size, 3, "the second run changed the row count");

  return `writes stayed at ${writesAfterFirst}`;
});

await checkAsync("feed-edited updates 1 in place, creates 1, leaves 2 alone, deletes nothing", async () => {
  const store = makeStore();

  await sync("feed-base", store);

  const before = store.rows.get("https://fixture.substack.com/p/first-post");
  const writesBefore = store.writes;
  const report = await sync("feed-edited", store);
  const after = store.rows.get("https://fixture.substack.com/p/first-post");

  assertEq([report.created, report.updated, report.unchanged], [1, 1, 2], "wrong action counts");
  assertEq(store.rows.size, 4, "a row was deleted, or the new post did not insert");
  assertEq(store.writes - writesBefore, 2, "more rows were written than changed");

  // Anchor: the title really did change, so "the slug did not" is a fact about
  // the sync rather than about a fixture that stopped differing.
  assert(before.title !== after.title, "ANCHOR FAILED: feed-edited.xml no longer changes the first post's title");
  assert(before.contentHash !== after.contentHash, "ANCHOR FAILED: the edited post's hash did not change");

  assertEq(after.slug, before.slug, "the slug was rewritten when the title changed");
  assertEq(after.slug, "first-post", "the slug is not the one assigned at insert");

  return `title "${before.title}" → "${after.title}", slug stayed ${after.slug}`;
});

await checkAsync("a malformed feed reports a feed-scope error and writes nothing", async () => {
  const store = makeStore();

  await sync("feed-base", store);

  const writesBefore = store.writes;
  const rowsBefore = store.rows.size;
  const report = await sync("feed-malformed", store);

  assert(writesBefore > 0, "ANCHOR FAILED: nothing was stored first, so 'stored posts survived' proves nothing");
  assertEq(report.ok, false, "a malformed feed was reported as a successful run");
  assertEq(report.errors.length, 1, `expected exactly one error: ${JSON.stringify(report.errors)}`);
  assertEq(report.errors[0].scope, "feed", "the error was not feed-scoped");
  assertEq(store.writes, writesBefore, "a failed feed disturbed the store");
  assertEq(store.rows.size, rowsBefore, "a failed feed changed the row count");

  return report.errors[0].message;
});

await checkAsync("a single-item feed syncs to exactly one post", async () => {
  const store = makeStore();
  const report = await sync("feed-single-item", store);

  assertEq(report.ok, true, `the run failed: ${JSON.stringify(report.errors)}`);
  assertEq(report.created, 1, "a one-item feed did not create exactly one post");
  assertEq(store.rows.size, 1, "wrong row count");
  assertEq([...store.rows.values()][0].slug, "the-only-post", "wrong slug");

  return "1 post";
});

await checkAsync("an empty feed succeeds and writes nothing", async () => {
  const store = makeStore();
  const report = await sync("feed-empty", store);

  assertEq(report.ok, true, `an empty feed was reported as a failure: ${JSON.stringify(report.errors)}`);
  assertEq([report.itemsSeen, report.created, report.skipped], [0, 0, 0], "an empty feed did something");
  assertEq(store.writes, 0, "an empty feed wrote to the store");

  return "no-op";
});

await checkAsync("degenerate items are skipped and the run continues past them", async () => {
  const store = makeStore();
  const report = await sync("feed-degenerate", store);

  assertEq(report.ok, true, "item-level skips must not fail the whole run");
  assertEq(report.itemsSeen, 5, "ANCHOR FAILED: feed-degenerate.xml no longer has five items");
  assertEq(report.skipped, 4, "wrong skip count");
  assertEq(report.created, 1, "the run did not continue past the skips");
  assertEq([...store.rows.values()][0].slug, "the-survivor", "the wrong item survived");
  assert(
    report.errors.every((error) => error.scope === "item"),
    "a skipped item produced a feed-scope error"
  );

  return "4 skipped, 1 created";
});

await checkAsync("colliding slugs become foo and foo-2, and re-running does not renumber them", async () => {
  anchor("feed-slug-collision", "https://fixture.substack.com/p/hello.world");

  const store = makeStore();

  await sync("feed-slug-collision", store);

  const slugs = [...store.rows.values()].map((row) => row.slug);

  assertEq(slugs, ["hello-world", "hello-world-2"], "the collision was not resolved by suffixing");

  await sync("feed-slug-collision", store);

  assertEq([...store.rows.values()].map((row) => row.slug), slugs, "a re-run renumbered the slugs");
  assertEq(store.rows.size, 2, "a re-run duplicated a post");

  return slugs.join(", ");
});

await checkAsync("a concurrent insert of the same sourceId is absorbed, not reported as a failure", async () => {
  const store = makeStore();
  const real = store.create.bind(store);
  let raced = false;

  // Simulate another sync winning the race: the row appears between our read
  // and our write, so `create` raises P2002 on sourceId exactly as Prisma would.
  store.create = async (record) => {
    if (!raced) {
      raced = true;
      await real(record);

      throw p2002("sourceId");
    }

    return real(record);
  };

  const report = await sync("feed-single-item", store);

  assert(raced, "ANCHOR FAILED: create was never called, so the race was never simulated");
  assertEq(report.ok, true, `the run failed: ${JSON.stringify(report.errors)}`);
  assertEq(report.skipped, 0, `losing the insert race was reported as a skip: ${JSON.stringify(report.errors)}`);
  assertEq(store.rows.size, 1, "the race produced a duplicate row");

  return `action was "${report.posts[0].action}"`;
});

// ── hashing ────────────────────────────────────────────────────────────────
section("Content hashing");

check("the same input hashes identically; one changed byte does not", () => {
  const [item] = parseFeedXml(fixture("feed-single-item")).items;
  const once = normalizeItem(item).post.contentHash;
  const twice = normalizeItem(item).post.contentHash;

  assertEq(once, twice, "hashing is not deterministic");

  const edited = normalizeItem({ ...item, contentEncoded: item.contentEncoded.replace("Hello", "Hellp") }).post;

  assert(edited.contentHash !== once, "a changed body did not change the hash");

  const retitled = normalizeItem({ ...item, title: `${item.title}!` }).post;

  assert(retitled.contentHash !== once, "a changed title did not change the hash");

  return `${once.slice(0, 12)}…`;
});

check("the hash is taken over the SANITIZED html, not the raw feed html", () => {
  const [item] = parseFeedXml(fixture("feed-single-item")).items;
  const base = normalizeItem(item).post.contentHash;

  // Two raw bodies that differ only in markup the sanitizer discards must hash
  // the same, because the hash covers exactly what would be written. That is
  // also what makes a tightened allowlist re-sync every stored row.
  const scaffolded = normalizeItem({
    ...item,
    contentEncoded: `<div class="pencraft"><span data-attrs="{}">${item.contentEncoded}</span></div>`,
  }).post;

  assertEq(scaffolded.contentHash, base, "the hash changed for markup that never reaches the database");
  assertEq(scaffolded.contentHtml, normalizeItem(item).post.contentHtml, "the sanitized bodies differ");

  return "hash follows the stored value";
});

// ── the report must not leak article content ───────────────────────────────
section("Report hygiene");

await checkAsync("no report field or error message contains article body text", async () => {
  const store = makeStore();
  const reports = [];

  for (const name of ["feed-base", "feed-degenerate", "feed-hostile", "feed-malformed"]) {
    reports.push(await sync(name, store));
  }

  // Distinctive phrases that exist ONLY inside a fixture's article body.
  const bodyPhrases = [
    "Opening paragraph with",
    "A pulled quote",
    "A body that will never be stored",
    "A body with nowhere to belong",
    "The run continued past every skip",
    "The body starts and",
  ];

  for (const phrase of bodyPhrases) {
    // Anchor against the payload, not the comments: a fixture comment that
    // quotes a body phrase would make this pass without the body existing.
    const inAFixture = readdirSync(FIXTURES).some((file) =>
      payload(readFileSync(join(FIXTURES, file), "utf8")).includes(phrase)
    );

    assert(inAFixture, `ANCHOR FAILED: no fixture contains ${JSON.stringify(phrase)} any more`);
  }

  for (const report of reports) {
    // `posts[].slug`/`sourceId` are identifiers, not content; serialize the
    // whole report and look for body text anywhere in it.
    const serialized = JSON.stringify({ errors: report.errors, posts: report.posts });

    for (const phrase of bodyPhrases) {
      assert(!serialized.includes(phrase), `the report leaked article text: ${JSON.stringify(phrase)}`);
    }

    assert(!/<[a-z]/i.test(serialized), `the report leaked markup: ${serialized.slice(0, 200)}`);
  }

  return `${reports.length} reports clean`;
});

await checkAsync("a store error's own message never reaches the report", async () => {
  const store = makeStore();

  // Drivers echo back the values they were handed, and one of those values is
  // the article body. This is what that looks like.
  const leaky = "Incorrect string value for column 'contentHtml' at row 1: '<p>Opening paragraph with</p>'";

  store.create = async () => {
    throw Object.assign(new Error(leaky), { code: "P2000" });
  };

  const report = await sync("feed-single-item", store);
  const serialized = JSON.stringify(report);

  assertEq(report.skipped, 1, "the failing write was not reported as a skip");
  assert(!serialized.includes("Opening paragraph"), `the driver's message reached the report: ${serialized}`);
  assert(!serialized.includes("contentHtml"), `the driver's message reached the report: ${serialized}`);
  assert(!/<[a-z]/i.test(serialized), `the report leaked markup: ${serialized}`);
  assert(
    report.errors.some((error) => error.message.includes("P2000")),
    `the error code was lost, leaving nothing to diagnose with: ${JSON.stringify(report.errors)}`
  );

  return report.errors[0].message;
});

await checkAsync("the report carries the counts and shape #154 needs", async () => {
  const store = makeStore();
  const report = await sync("feed-base", store);

  for (const key of [
    "ok", "feedUrl", "startedAt", "finishedAt", "durationMs",
    "itemsSeen", "created", "updated", "unchanged", "skipped", "posts", "errors",
  ]) {
    assert(key in report, `the report is missing ${key}`);
  }

  assertEq(report.feedUrl, FEED_URL, "the report did not echo the feed url");
  assertEq(report.itemsSeen, 3, "wrong itemsSeen");

  for (const post of report.posts) {
    for (const key of ["sourceId", "slug", "action", "embedsRemoved", "imagesDropped"]) {
      assert(key in post, `a post entry is missing ${key}`);
    }
  }

  return `${report.posts.length} post entries`;
});

// ── result ─────────────────────────────────────────────────────────────────
console.log(
  failures === 0
    ? "\nAll checks passed."
    : `\n${failures} check${failures === 1 ? "" : "s"} FAILED.`
);

process.exit(failures === 0 ? 0 : 1);
