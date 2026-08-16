// Heading ids for a synced post's table of contents.
//
// MDX gets its ids from `Heading2` in src/mdx-components.js, a React component
// that renders the heading. Injected HTML never goes through React, so a synced
// post's <h2>s would reach the page with no id at all — and PostBody.jsx uses
// `h.id` as BOTH the anchor href and the React key, so "no id" is a TOC of dead
// `#` links with duplicate empty keys. This adds them server-side instead, in
// `fromSyncedRow`, before the HTML is ever handed to a component.

// Moved verbatim from `slugify` in src/mdx-components.js, which now imports it
// from here: the two must agree byte for byte or the same heading text would
// anchor differently depending on where the post came from.
export const slugifyHeading = (value) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");

// Same set src/lib/blog/reading-time.mjs decodes; duplicated rather than
// imported because that module is `.mjs` for next.config.mjs's sake and this one
// is bundled `.js`.
const ENTITIES = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&nbsp;": " ",
};

const decodeEntities = (text) =>
  text.replace(/&(?:amp|lt|gt|quot|#39|nbsp);/g, (entity) => ENTITIES[entity]);

// Safe for the same reason `firstImageSrc` in src/lib/substack/normalize.js says
// it is: this runs over OUR OWN re-serialized sanitizer output, where <h2>
// provably carries no attributes (only a, img, source, th and td keep any) and
// cannot nest inside another <h2>. It is not a general-purpose HTML parser and
// must never be pointed at feed text.
const H2 = /<h2>([\s\S]*?)<\/h2>/g;

const textOf = (inner) => decodeEntities(inner.replace(/<[^>]*>/g, "")).trim();

/**
 * Returns `html` with an `id` on every `<h2>`.
 *
 * Ids are unique within the document (`-2`, `-3`… on a repeat) and never empty
 * (`section-<n>` when the text slugifies to nothing, e.g. a heading of pure
 * punctuation) — PostBody keys off them, so "unique and non-empty" is a hard
 * requirement rather than a nicety. The emitted value has been through
 * `slugifyHeading`, so it holds only letters, numbers and hyphens and cannot
 * break out of the attribute.
 */
export const withHeadingIds = (html) => {
  const used = new Set();
  let index = 0;

  return String(html ?? "").replace(H2, (match, inner) => {
    index += 1;

    const base = slugifyHeading(textOf(inner)) || `section-${index}`;

    let id = base;
    for (let attempt = 2; used.has(id); attempt += 1) id = `${base}-${attempt}`;

    used.add(id);

    return `<h2 id="${id}">${inner}</h2>`;
  });
};
