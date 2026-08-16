# `src/lib/substack` — Substack ingestion

Reads the publication's RSS feed, normalizes each item, sanitizes the article
HTML, and writes the result into the `SubstackPost` table. Nothing here renders
anything; the blog's presentation layer is untouched (that is #153).

```
syncSubstackPosts({ feedUrl, readFeed, store, now })
        │
readFeed() ──► feed.js        fetch + XML parse  (the ONLY module that knows RSS)
        │
        ├──► normalize.js     item → the normalized post shape
        │      └──► sanitize.js   the security boundary
        │
        └──► store            { findBySourceIds, findBySlug, create, update }
                                default = store.js (Prisma); the verify script
                                passes an in-memory one
```

## Rules

**RSS field names stop at `feed.js`.** `content:encoded`, `dc:creator`,
`enclosure`, `pubDate`, `guid` and the `@_` attribute prefix appear in that file
and nowhere else in the repo. Everything downstream sees the flat `RawItem`
shape, in which every field is a string or `null`. Grep for those names before
adding one somewhere else.

**Sanitization is a security boundary, not a formatting step.** `sanitize.js`
has the full reasoning in its header: the `sanitize-html` version floor and the
five 2026 bypasses behind it, why DOMPurify and rehype-sanitize were rejected,
and — importantly — why the archived GitHub repo and its "this is unmaintained"
issue are both stale. The package lives in the ApostropheCMS monorepo and ships
monthly. Check npm before believing otherwise.

Two traps in the config that are easy to reintroduce:

- `allowedAttributes` is applied **after** `transformTags`, so an attribute a
  transform adds is silently stripped unless it is also allowlisted. `rel` and
  `target` on `<a>` are exactly that case, and the symptom is invisible: links
  render perfectly, they just carry no `rel`.
- A relative `href` or `src` carries **no scheme**, so scheme checking never
  fires on it — and once stored and rendered it resolves against `csalinas.dev`.
  Everything that survives is forced through an absolute `http(s)` check.

**Every `<iframe>` is removed.** None are allowed, by host or otherwise: an
iframe is a third-party origin executing script inside this page, a host
allowlist is a URL-parsing problem and URL parsing is where this library's 2026
CVEs lived, and this site's posture is to avoid third-party requests at all
(`src/lib/qr.js` is a from-scratch QR encoder written so that one view makes
none). Removal is not silent — the iframe becomes a link to the same URL reading
"Embedded content on `<hostname>`", and the removal is counted into the sync
report as `embedsRemoved` so an operator can see a post lost an embed. Allowing a
specific embed later is a small additive change; a bad allow now is live XSS.

`<div>` and `<span>` are dropped (their children are kept). No `class` or
`style` survives anywhere, so a surviving `<div>` would carry exactly zero
information while importing Substack's layout scaffolding. This is the
mechanical enforcement of #151's "typography/layout is controlled entirely by the
site's existing components".

**The slug is frozen at insert.** It is assigned once, in `insert()` in
`sync.js`, and never appears in an update patch — `MUTABLE_FIELDS` does not
contain it and `updatePatch` refuses to return a patch that does. This is the
answer to "Substack changed the title after we assigned a slug": the title
updates in place and every inbound link to the old URL survives. The tempting
`update: { ...post }` would rewrite it and nothing would fail loudly.

**The content hash is taken after sanitization**, over exactly the values that
would be written. So "hash equal" means "the stored row is already identical to
what we would write", and tightening the sanitizer allowlist changes every hash
and re-syncs every post on the next run. Hashing the raw feed HTML would leave
old rows frozen at an older, weaker sanitizer forever. That is a security
property, not an optimization. (It is a hash and not a timestamp because a
Substack `<item>` has no `atom:updated` and its `pubDate` does not move when the
post is edited — verified across 40 real items.)

**Nothing here deletes a row.** Substack's RSS window shows only the most recent
~20 posts, so "not in the feed" means "old", never "removed". There is no delete
path and there should not be one.

**Never call `syncSubstackPosts` from a page render.** #151 section 5 and 9: a
blog page that syncs is a blog page that breaks when Substack is down. #154 wires
the trigger.

## The report

```js
{
  ok, feedUrl, startedAt, finishedAt, durationMs,
  itemsSeen, created, updated, unchanged, skipped,
  posts: [{ sourceId, slug, action, embedsRemoved, imagesDropped, reason? }],
  errors: [{ scope: "feed" | "item", sourceId?, message }],
}
```

`ok` is false only for a **feed-scope** failure — the feed could not be read or
parsed, and the run performed zero writes. One malformed item does not abort a
sync and does not set `ok: false`; it lands in `posts` as `action: "skipped"` and
in `errors` with `scope: "item"`. That distinction is what lets #154 tell "the
sync is broken" from "one post is broken".

**No message and no report field may contain article HTML or body text** (#151
section 9). An item is identified by its `sourceId` and a short reason; store
failures are reported by error *code*, never by the driver's message, because a
driver is free to echo back the values it was handed and one of those values is
the article body. Every message goes through `reportable()`, which collapses
whitespace and caps at 200 characters.

## Known limitations, accepted on purpose

**A changed Substack slug forks the post.** The guid *is* the Substack URL, so
if the author changes a post's slug on Substack its guid changes and the sync
cannot tell it is the same post: it inserts a second row with a second local
slug. Both show up in the report as a `created`. The remedy is operator-level —
delete the stale row. The alternatives are title matching (#151 rules it out) or
fuzzy content matching, which has worse failure modes than the problem.

**Partially-paywalled posts arrive truncated.** Substack puts only the free
preview in RSS. Ingesting the truncated body is correct — it is what is public —
and #151's non-goals rule out reaching for the rest. Nobody should "fix" this.

**Feed parse errors quote the parser's message.** `fast-xml-parser` reports
structural problems ("closing tag … expected"), which name RSS tags rather than
article content, and article bodies live inside CDATA the parser never tokenizes.
The message is still passed through `reportable()`'s 200-character cap rather
than trusted.

## Verifying

```bash
node .agent/scripts/verify-substack-sync.mjs
```

No network and no database: the script injects a fixture-reading `readFeed` and
an in-memory `store` that **counts** its `create`/`update` calls, so "running it
twice writes nothing" is proven rather than asserted. It also carries the
sanitizer's payload battery, including every named 2026 CVE, as a regression
check. Fixtures are in `.agent/fixtures/substack/`.
