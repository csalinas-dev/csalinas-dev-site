# `src/lib/blog` — the blog's data layer

One shape, two sources. `/blog` and `/blog/[slug]` import this and nothing else;
neither route knows a post came from an `.mdx` file or from Substack.

```
getPosts()                 index.js ──► @/content/posts    the MDX registry
getPost(slug)                   │   └──► synced.js         Prisma (SubstackPost)
getAdjacentPosts(slug)          │
                                └──► shape.js        one shape, merge, order,
                                     headings.js     adjacency — all PURE
                                     reading-time.mjs
```

`shape.js`, `headings.js` and `reading-time.mjs` import no Prisma, no `.mdx` and
no `@/` alias, which is what lets `.agent/scripts/verify-blog-posts.mjs` exercise
the merge, the ordering and the collision rule under plain `node` with no
database.

## The shape

```
summary  { source: "mdx" | "substack", slug, title, description|null,
           date /* "YYYY-MM-DD" */, publishedAt /* Date */, category|null,
           cover /* StaticImageData | string | null */, tags: [] }
full     summary + { hero, readingTime, link|null, linkLabel|null,
                     Content /* component */ | null, contentHtml /* string */ | null }
```

**Exactly one of `Content` and `contentHtml` is non-null.** The post page
branches on it and that branch is the only `dangerouslySetInnerHTML` in the blog.

**`cover`/`hero` is an object for MDX and a string for synced.** Components
branch on `typeof`. A remote image renders as a plain `<img>`, deliberately not
`next/image`: an optimized remote image requires its host in `next.config.mjs`'s
`remotePatterns`, and a Substack CDN hostname that is missing from that list is a
hard render failure caused by third-party data. The article body's images are
already plain remote `<img>`s, so the cover matches them.

`date` stays a `YYYY-MM-DD` string for both sources because both call sites do
`new Date(date + "T00:00:00")` — local midnight, or a bare `YYYY-MM-DD` parses as
UTC and renders a day early west of Greenwich.

## Rules

**AN MDX POST ALWAYS OWNS ITS SLUG.** The slugs in `src/content/posts/` are
reserved names in the `/blog/<slug>` namespace. The Substack sync will never
assign one — it skips a reserved candidate exactly as it skips a taken one and
moves on to `-2`, `-3`… And if a row somehow already holds a reserved slug (it
predates this rule, or an MDX post was added afterwards), the read layer resolves
that URL to the MDX post and drops the synced row from every listing, logging its
slug once so the shadowing is visible in the server log. The remedy for a
shadowed row is operator-level: rename the MDX directory, or delete the row.

MDX wins because those URLs are already public, already linked, and already the
target of the permanent `/projects/:slug` redirect; a synced post that has never
been published at that URL loses nothing by being `-2`. Suffixed rather than
refused, because a refused post never appears at all — and because the slug is
frozen at insert (`MUTABLE_FIELDS` in `sync.js`), the suffixed URL is stable
forever.

Enforced at **both** ends on purpose. `src/content/posts/slugs.js` is the list;
`freeSlug` in `sync.js` reads it (by a *relative* import — the `@/` alias does not
resolve under the plain-node hook the verify scripts use), and `mergePosts` here
reads it implicitly, as the set of MDX slugs in the merge. One end alone leaves a
race: a post synced before an MDX post is added would keep the URL.

**MDX posts never touch the database.** `getPost` checks the registry first and
returns without querying, and `getPosts` degrades to MDX-only when the store
throws. So `/blog` and `/blog/hashtag` still render with MySQL down.

**Both routes are `force-dynamic`.** They query MySQL, and the Docker image runs
`next build` *before* the deploy runs `prisma db push` — the same reason
`wordleverse/leaderboard/page.js` is. `generateStaticParams` and
`dynamicParams = false` are therefore gone from `[slug]/page.jsx`: a synced post
that arrives between deploys has to be reachable without a rebuild.

**No cache.** Not `unstable_cache`, not `revalidate`. A stale listing right after
a sync is a worse first bug than one small query per blog request; add caching
when there is a measurement saying it is needed.

**A store error is logged by code, never by message.** A driver is free to echo
back the values it was handed and one of those is an article body — the same rule
`storeReason` follows in `sync.js`. The shadowed-slug warning carries the slug
and nothing else, for the same reason.

**Heading ids for synced posts come from `withHeadingIds`,** applied in
`fromSyncedRow` rather than in a component. MDX gets its ids from `Heading2` in
`src/mdx-components.js`, a React component that never runs over injected HTML,
and `PostBody.jsx` uses the id as both the anchor and the React key — so a synced
post without them is a table of contents of dead links with duplicate keys. The
slugifier itself is shared, so the same heading text anchors identically whatever
the source.

**Reading time is one formula.** `reading-time.mjs` holds the 200 wpm constant
and the rounding; `src/lib/mdx/remark.mjs` counts mdast text nodes at build time
and `readingTimeFromHtml` counts words in the stored HTML at render time, both
excluding code. It is `.mjs` because `next.config.mjs` loads `remark.mjs` under
plain Node.

**No re-sanitization at render time.** `contentHtml` is already the sanitized
artefact (`src/lib/substack/sanitize.js`), the content hash is taken *after*
sanitizing, and so tightening the allowlist there re-syncs every post
automatically. Filtering in a component instead would leave old rows on the old
rules forever. If something renders badly because a tag was dropped, change the
allowlist — not the renderer.

**The body is third-party, so the prose theme has to survive content the author
did not write.** This is the same class of statement as the sanitizer's and it is
a *layout* one, not a security one: a pasted credential, a commit hash, a wallet
address, a hyphen-free URL and a twelve-column metrics table are all ordinary
newsletter content, all of it survives `sanitize.js` completely intact, and none
of it is a sanitizer problem — narrowing what a visitor's own writing may contain
would be the wrong lever for a layout bug.

Each of those sets a min-content width larger than the article's grid track, and
a grid track is min-content sized by default. The failure that produces is not
"one line overflows": the `<article>` element itself inflates to the width of its
widest unbreakable thing (measured: 382px → 663px in a 430px viewport from one
63-character token), so **every** paragraph in the post is laid out wider than
the phone and `<body>` — this site's scroll container — scrolls sideways. So
`[slug]/components.jsx` carries `overflow-wrap: anywhere` and `overflow-x: clip`
on `Article`, `min-width: 0` plus `minmax(0, 1fr)` on the body grid, a scrollable
`table` (with cells opting back out of `anywhere`, or the columns squeeze to
32px instead of scrolling), and `overflow-wrap: anywhere` on the title, the
subtitle, the prev/next links and the listing's cards — the three other places a
synced post's own text is rendered.

`.agent/scripts/verify-blog-overflow.mjs` is the gate, over
`.agent/fixtures/substack/feed-overflow.xml`, at 1200px and 430px.

## Verifying

```bash
node .agent/scripts/verify-blog-posts.mjs      # pure modules; no network, no database
node .agent/scripts/verify-blog-dom.mjs <url> out.json [--expect base.json]
node .agent/scripts/verify-blog-overflow.mjs <url> [--widths 1200,430]
```

The second captures the rendered DOM of `/blog` and the three MDX posts and diffs
it against a capture from an unmodified base branch. It proves **structure, text,
metadata and article geometry are unchanged** — not appearance: emotion class
names are normalized to `css-*` (they are content hashes and move on any CSS
edit anywhere) and no computed style is read, so a purely visual change that
reflows nothing passes it. Turning `h3 { color: var(--function) }` red is visible
on two of the three posts and reports "No differences". Treat it as the
regression gate it is, and look at a post with your eyes before claiming one
*looks* the same.

The third seeds nothing itself: run `seed-substack-fixture.mjs` over
`feed-overflow.xml` first, or its anchors will tell you the fixture is missing.
Both need a running `next start`.
