// The blog's data layer — the only post source /blog and /blog/[slug] import.
// See ./README.md for the shape, the slug collision rule and the decisions.

import { posts } from "@/content/posts";

import { adjacentIn, fromMdxPost, fromSyncedRow, mergePosts } from "./shape";
import { findSyncedPost, listSyncedPosts } from "./synced";

/**
 * Every post, newest first, from both sources.
 *
 * Degrades to MDX-only if the store is unreachable: /blog is three hand-written
 * posts plus whatever synced, and losing the second of those is not a reason to
 * lose the first. Only the error's code/name is logged, never its `message` —
 * for the reason src/lib/substack/sync.js's `storeReason` gives, that a driver
 * is free to echo back the values it was handed and one of those is an article
 * body.
 */
export const getPosts = async () => {
  const mdx = posts.map((post) => fromMdxPost(post));

  try {
    const synced = await listSyncedPosts();

    return mergePosts(
      mdx,
      synced.map((row) => fromSyncedRow(row))
    );
  } catch (error) {
    console.error(
      `[blog] listing synced posts failed (${error?.code ?? error?.name ?? "unknown"}); serving MDX posts only.`
    );

    return mdx;
  }
};

/**
 * One post, in full, or `undefined`.
 *
 * The registry is checked FIRST and returns without touching the database. That
 * single line is both halves of "an MDX post always owns its slug" — it settles
 * precedence for a row that somehow holds a reserved slug, and it is why an MDX
 * post still renders when MySQL is down.
 *
 * A failure on the synced branch is allowed to propagate: a database outage is a
 * 500, not a `notFound()`. Telling a crawler the post is gone is a worse and far
 * more permanent answer than telling it to come back later.
 */
export const getPost = async (slug) => {
  const mdx = posts.find((post) => post.slug === slug);

  if (mdx) return fromMdxPost(mdx, { full: true });

  const row = await findSyncedPost(slug);

  return row ? fromSyncedRow(row, { full: true }) : undefined;
};

// Adjacency is computed over the merged list, so the post footer can walk from a
// synced post to an MDX one. It inherits `getPosts`'s degradation: with the
// store down an MDX post renders with MDX-only neighbours rather than 500ing.
export const getAdjacentPosts = async (slug) => adjacentIn(await getPosts(), slug);
