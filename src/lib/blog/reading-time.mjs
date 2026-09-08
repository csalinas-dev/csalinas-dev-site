/**
 * Reading time, for both post sources.
 *
 * The constant and the formula live here and nowhere else: MDX counts words off
 * the mdast tree at build time (src/lib/mdx/remark.mjs) and a synced post counts
 * them off its stored HTML at render time, but two posts of the same length must
 * report the same number or the rail is lying about one of them.
 *
 * `.mjs` because remark.mjs is loaded by next.config.mjs under plain Node, which
 * can only reach this by an explicit-extension relative path.
 */

export const WORDS_PER_MINUTE = 200;

// Never zero: a one-line post is a one-minute read, not a no-minute one.
export const minutesForWords = (words) =>
  Math.max(1, Math.round(words / WORDS_PER_MINUTE));

// Mirrors what the mdast walk counts, which is `text` nodes only — a fence's
// body is `code.value` and inline code is `inlineCode`, so neither is prose.
// Dropping the elements whole (not just their tags) is what keeps the HTML side
// agreeing with the MDX side.
const CODE_BLOCKS = /<(pre|code)\b[^>]*>[\s\S]*?<\/\1>/gi;
const COMMENTS = /<!--[\s\S]*?-->/g;
const TAGS = /<[^>]*>/g;

// The entities sanitize-html emits when it re-serializes. Decoded so
// "you&#39;re" counts as one word rather than three.
const ENTITIES = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&nbsp;": " ",
};

export const decodeEntities = (text) =>
  text.replace(/&(?:amp|lt|gt|quot|#39|nbsp);/g, (entity) => ENTITIES[entity]);

export const countHtmlWords = (html) =>
  decodeEntities(
    String(html ?? "")
      .replace(COMMENTS, " ")
      .replace(CODE_BLOCKS, " ")
      .replace(TAGS, " ")
  )
    .split(/\s+/)
    .filter(Boolean).length;

export const readingTimeFromHtml = (html) =>
  minutesForWords(countHtmlWords(html));
