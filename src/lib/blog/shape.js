// The one post shape, and the pure functions that produce and order it.
//
// Pure on purpose: no Prisma, no `.mdx`, no `@/` alias, nothing that needs a
// bundler. That is what lets .agent/scripts/verify-blog-posts.mjs exercise the
// merge, the ordering, the adjacency and the collision rule under plain `node`
// with no database — the same trick src/lib/substack/sync.js uses for its store.
//
// The shape:
//
//   summary  { source: "mdx" | "substack", slug, title, description|null,
//              date /* "YYYY-MM-DD" */, publishedAt /* Date */, category|null,
//              cover /* StaticImageData | string | null */, tags: [] }
//   full     summary + { hero, readingTime, link|null, linkLabel|null,
//                        Content /* component */ | null,
//                        contentHtml /* string */ | null }
//
// INVARIANT: exactly one of `Content` and `contentHtml` is non-null. The post
// page branches on it, and that branch is the only dangerouslySetInnerHTML in
// the blog.
//
// `cover` and `hero` are a StaticImageData object for an MDX post (next/image
// needs the width, height and blur data) and a plain URL string for a synced
// one. Components branch on `typeof`, because a remote cover is deliberately not
// run through next/image — see README.md.

import dateFormat from "dateformat";

import { readingTimeFromHtml } from "./reading-time.mjs";
import { withHeadingIds } from "./headings";

// The MDX registry stores the date as the YYYY-MM-DD string an author typed, and
// both routes turn it into local midnight so a date west of Greenwich does not
// render a day early (the convention CLAUDE.md records for the Wordleverse
// header). Keeping `date` a string in the shape is what keeps those call sites —
// and that note — true for both sources.
const localMidnight = (date) => new Date(date + "T00:00:00");

export const fromMdxPost = (post, { full = false } = {}) => {
  const summary = {
    source: "mdx",
    slug: post.slug,
    title: post.title,
    description: post.description ?? null,
    date: post.date,
    publishedAt: localMidnight(post.date),
    category: post.category ?? null,
    cover: post.cover ?? null,
    tags: post.tags ?? [],
  };

  if (!full) return summary;

  return {
    ...summary,
    // The post page has always fallen back to the cover when a post declares no
    // separate hero.
    hero: post.hero ?? post.cover ?? null,
    readingTime: post.readingTime,
    link: post.link ?? null,
    linkLabel: post.linkLabel ?? null,
    Content: post.Content,
    contentHtml: null,
  };
};

export const fromSyncedRow = (row, { full = false } = {}) => {
  const summary = {
    source: "substack",
    slug: row.slug,
    title: row.title,
    description: row.description ?? null,
    // Server-local, matching the MDX side: `date` is what the page turns back
    // into local midnight for FormattedDate.
    date: dateFormat(row.publishedAt, "yyyy-mm-dd"),
    publishedAt: row.publishedAt,
    // A synced post has neither. Both render as absent rather than as a
    // placeholder — see the conditional rendering in the two routes.
    category: null,
    cover: row.coverImage ?? null,
    tags: [],
  };

  if (!full) return summary;

  return {
    ...summary,
    hero: row.coverImage ?? null,
    // Counted here rather than stored, so a change to the formula does not need
    // a re-sync to take effect.
    readingTime: readingTimeFromHtml(row.contentHtml),
    link: row.sourceUrl ?? null,
    // Re-uses the header's existing external-link slot; no new UI.
    linkLabel: "Read on Substack",
    Content: null,
    // The ids PostBody's TOC anchors and keys off. Applied here, not in a
    // component: by the time the HTML reaches React it is a string.
    contentHtml: withHeadingIds(row.contentHtml),
  };
};

/**
 * Merges the two sources into one newest-first list.
 *
 * AN MDX POST ALWAYS OWNS ITS SLUG. The sync will not assign a reserved slug in
 * the first place; this is the other half of the rule, for a row that predates
 * it or an MDX post added after the fact. The shadowed row is dropped from every
 * listing and its slug — AND NOTHING ELSE, never a title and never a line of the
 * body (#151 section 9) — is logged once so the shadowing is visible instead of
 * silent. The remedy is operator-level: rename the MDX directory or delete the
 * row.
 */
export const mergePosts = (mdxPosts, syncedPosts) => {
  const reserved = new Set(mdxPosts.map((post) => post.slug));
  const kept = [];

  for (const post of syncedPosts) {
    if (reserved.has(post.slug)) {
      console.warn(
        `[blog] synced post "${post.slug}" is shadowed by an MDX post of the same slug and was dropped from the listing.`
      );
      continue;
    }

    kept.push(post);
  }

  // Slug ascending as the tiebreaker, so two posts published at the same instant
  // still have ONE order. `sort` is stable, but the input order here is two
  // queries concatenated, which is not a thing to depend on.
  return [...mdxPosts, ...kept].sort(
    (a, b) =>
      b.publishedAt.getTime() - a.publishedAt.getTime() ||
      a.slug.localeCompare(b.slug)
  );
};

/**
 * The list is sorted newest first, so the *older* neighbour is the next entry
 * in the array. "Previous" in the post footer means the older post.
 */
export const adjacentIn = (list, slug) => {
  const i = list.findIndex((post) => post.slug === slug);

  if (i === -1) return { previous: null, next: null };

  return { previous: list[i + 1] ?? null, next: list[i - 1] ?? null };
};
