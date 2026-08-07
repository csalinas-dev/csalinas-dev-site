/**
 * The blog's post registry.
 *
 * This list is hand-maintained on purpose. Every post is a build-time ESM
 * import, so there is no runtime markdown compilation and no `fs` read: the
 * whole blog prerenders, and a malformed post fails `npm run build` rather than
 * a request. It mirrors how the repo registers other pluggable things — see
 * `src/lib/realtime/registry.js`.
 *
 * To add a post: create `src/content/posts/<slug>/index.mdx` (a `meta` export
 * plus the body, images imported alongside it) and add one line below. The
 * directory name is the slug and the URL; `meta` never carries one.
 */
import * as goldwaterBank from "./goldwater-bank/index.mdx";
import * as hashtag from "./hashtag/index.mdx";
import * as wordleverse from "./wordleverse/index.mdx";

const modules = { "goldwater-bank": goldwaterBank, hashtag, wordleverse };

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

export const getPost = (slug) => posts.find((post) => post.slug === slug);

export const getPostSlugs = () => posts.map(({ slug }) => slug);

/**
 * `posts` is sorted newest first, so the *older* neighbour is the next entry
 * in the array. "Previous" in the post footer means the older post.
 */
export const getAdjacentPosts = (slug) => {
  const i = posts.findIndex((post) => post.slug === slug);
  if (i === -1) return { previous: null, next: null };
  return { previous: posts[i + 1] ?? null, next: posts[i - 1] ?? null };
};
