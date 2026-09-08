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

The second trap is why the allowlist is **data, not code**. `ELEMENTS` in
`sanitize.js` declares every surviving element once, and both `allowedAttributes`
and the `transformTags` that police URLs are *derived* from it: an attribute
listed under `urls` is routed through a validator (`url`, `link`, `srcset`), and
`auditAllowlist()` — run at import time, so a mistake is a boot failure — refuses
to let a name in `URL_BEARING` be allowlisted as a plain attribute instead. There
is therefore no way to allow a URL-bearing attribute without checking it.

That shape replaced three hand-written transforms, and it replaced them because
hand-writing them shipped a hole. `<source>` was allowlisted with `srcset` while
the absolute check lived inside the `img` transform, so `javascript:`, `data:`
and `//evil` died on the scheme check but a scheme-*less* `srcset="/admin/x 1x"`
had nothing to trip over and survived. Inside `<picture>` the browser prefers the
`<source>` over the `<img>`, so a visitor's browser would have issued a
same-origin `GET` on a path a third party chose — while `imagesDropped` stayed
`0` and the sync report said nothing had happened. Three elements had the trap
closed and the fourth did not; a fourth hand-written transform would have been
the same bug waiting for the fifth element.

A `srcset` is **not** split on `,`. Per the HTML spec a candidate URL is a run of
non-whitespace characters, so a comma inside a URL path is legal — and Substack's
CDN puts its transform parameters in the path, which makes commas the norm rather
than the exception (measured on the live `astralcodexten.com` feed: 59 of 67 `src`
values contain one). Splitting on `,` turned one real candidate into an absolute
URL plus four fragments that are not URLs at all, so an "every candidate is
absolute" check rejected the whole attribute and deleted every `<source>` in every
image-bearing post while reporting them as dropped images. The validator therefore
calls `parse-srcset` — the WHATWG algorithm, and specifically the *same* parser
`sanitize-html` runs on the attribute immediately afterwards, so the two can never
disagree about where a candidate begins.

When a required URL fails, the whole element is dropped and counted into
`imagesDropped`, so the removal reaches the sync report rather than vanishing.

**The drop is done by `exclusiveFilter`, not by renaming the tag, and that is a
workaround for an upstream bug.** In `sanitize-html` 2.17.7
(`node_modules/sanitize-html/index.js:667-681`) a transform that returns a
different `tagName` records it in `transformMap[depth]`; if the new name is not
allowed, `onclosetag` takes the `skip` branch and returns *before* the line that
deletes that entry. The stale entry is then consumed by the **next** element
closed at the same depth — anywhere in the document, not just a sibling — whose
closing tag is emitted under the wrong name. Renaming to a non-void stand-in
emitted a literal `</span>` where a `</a>` belonged; renaming to a void one
(`<col>`) suppressed the closing tag entirely. Both render the same wrong page:

    in   <p><img src="rel.png"><a href="https://evil/x">click</a> rest of it</p>
    out  <p><a href="https://evil/x" …>click rest of it</p>

— the remainder of the paragraph becomes a clickable third-party link, with both
the dropped image and the link chosen by the untrusted side. Keeping the tag name
and deleting the element at its closing tag creates no `transformMap` entry, so
there is nothing to go stale. Do not "simplify" this back into the transform.
The counter lives in `exclusiveFilter` for a second reason: `sanitize-html`'s own
attribute pass runs *after* the transform and can itself delete a URL attribute
(an unparseable `srcset` descriptor, say), so the closing tag is the only place
that sees what the element finally holds.

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

**An MDX post always owns its slug.** `freeSlug` skips any candidate in
`reservedSlugs` (default: `src/content/posts/slugs.js`) exactly as it skips one
already taken, so a Substack post whose path reduces to an MDX slug is stored as
`<slug>-2` and `/blog/<slug>` keeps serving the hand-written post. That import is
**relative** — the `@/` alias does not resolve under the plain-node hook the
verify script uses. The read half of the rule lives in `src/lib/blog`; both
halves exist because one alone leaves a race.

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

**Never `await` `syncSubstackPosts` in a page render.** #151 section 5 and 9: a
blog page that waits for Substack is a blog page that breaks when Substack is
down.

The blog pages *do* call it — after they have finished rendering. #154 made the
read path the trigger: both blog routes call `scheduleSubstackRefresh()` from
`./refresh.js` as their first statement, and that function does exactly one
thing, `after(cb)` from `next/server`, so the sync starts once the response is
already on the wire. A slow, down or garbage feed therefore cannot reach a
visitor; the page renders from MySQL exactly as it would have. The cost is that
the visitor who triggers a sync does not see its result — the next one does.

Calls are bounded by `./throttle.js`, a **10-minute single-flight gate**: a run
already in flight is joined rather than duplicated, and a completed run closes
the window for ten minutes whether it succeeded or failed. The gate is
deliberately not `unstable_cache` — it bounds a *write*, not a return value, and
`unstable_cache` gives no single-flight across concurrent misses. Its header
carries the full reasoning. The deploy also syncs once, through
`scripts/sync-substack.mjs`.

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
