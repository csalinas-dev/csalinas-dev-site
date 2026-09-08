/**
 * The blog's MDX post registry — one of the two sources `src/lib/blog` merges.
 * The routes do not import this module; they import `@/lib/blog`.
 *
 * This list is hand-maintained on purpose. Every post is a build-time ESM
 * import, so there is no runtime markdown compilation and no `fs` read: a
 * malformed post fails `npm run build` rather than a request. It mirrors how the
 * repo registers other pluggable things — see `src/lib/realtime/registry.js`.
 *
 * To add a post: create `src/content/posts/<slug>/index.mdx` (a `meta` export
 * plus the body, images imported alongside it), add one line below, and add the
 * slug to ./slugs.js — the check below fails the build if you forget, because an
 * unreserved slug is one the Substack sync could take. The directory name is the
 * slug and the URL; `meta` never carries one.
 */
import * as goldwaterBank from "./goldwater-bank/index.mdx";
import * as hashtag from "./hashtag/index.mdx";
import * as wordleverse from "./wordleverse/index.mdx";

import { MDX_SLUGS } from "./slugs";

const modules = { "goldwater-bank": goldwaterBank, hashtag, wordleverse };

// Drift between the registry and the reserved list is a build failure, never a
// quietly un-reserved slug — same idiom as `validate` below and `auditAllowlist`
// in src/lib/substack/sanitize.js.
const auditReservedSlugs = () => {
  const registered = new Set(Object.keys(modules));
  const reserved = new Set(MDX_SLUGS);
  const missing = [...registered].filter((slug) => !reserved.has(slug));
  const extra = [...reserved].filter((slug) => !registered.has(slug));

  if (missing.length > 0 || extra.length > 0) {
    throw new Error(
      "src/content/posts/slugs.js is out of sync with the post registry:" +
        (missing.length > 0 ? ` missing ${missing.join(", ")};` : "") +
        (extra.length > 0 ? ` extra ${extra.join(", ")};` : "") +
        " every MDX slug must be reserved there or the Substack sync could take it."
    );
  }
};

auditReservedSlugs();

export const CATEGORIES = Object.freeze([
  "Projects",
  "Engineering",
  "AI",
  "Tips & Tricks",
]);

const REQUIRED = ["title", "description", "date", "cover", "category"];
const DATE = /^\d{4}-\d{2}-\d{2}$/;

const validate = (slug, meta) => {
  if (!meta) {
    throw new Error(`Post "${slug}" is missing its \`export const meta\`.`);
  }
  for (const key of REQUIRED) {
    if (!meta[key]) {
      throw new Error(`Post "${slug}" is missing \`meta.${key}\`.`);
    }
  }
  if (!CATEGORIES.includes(meta.category)) {
    throw new Error(
      `Post "${slug}" has category "${meta.category}", which is not one of: ${CATEGORIES.join(", ")}.`
    );
  }
  if (!DATE.test(meta.date)) {
    throw new Error(
      `Post "${slug}" has date "${meta.date}"; expected YYYY-MM-DD.`
    );
  }
  return meta;
};

// Injected into every compiled post by remarkReadingTime (src/lib/mdx/remark.mjs).
// A missing value means the plugin fell out of next.config.mjs, which must fail
// the build rather than ship a post with a blank metadata rail.
const validateReadingTime = (slug, readingTime) => {
  if (typeof readingTime !== "number" || !(readingTime > 0)) {
    throw new Error(
      `Post "${slug}" has no \`readingTime\`; is remarkReadingTime wired in next.config.mjs?`
    );
  }
  return readingTime;
};

export const posts = Object.entries(modules)
  .map(([slug, mod]) => ({
    slug,
    ...validate(slug, mod.meta),
    readingTime: validateReadingTime(slug, mod.readingTime),
    Content: mod.default,
  }))
  .sort((a, b) => b.date.localeCompare(a.date));

// Lookup and adjacency deliberately do not live here any more: they are
// `src/lib/blog`'s job now, because they have to see synced posts too and two
// sources of truth for adjacency is exactly the bug the unified layer exists to
// prevent.
