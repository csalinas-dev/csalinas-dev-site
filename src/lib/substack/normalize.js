// Turns one RawItem from feed.js into the shape the database stores.
//
// Pure and total: `normalizeItem` NEVER throws. A single malformed item must not
// abort a sync, so every failure is returned as `{ ok: false, reason }` and the
// caller reports it and moves on.
//
// Two decisions worth not re-litigating:
//
// A HASH, NOT A TIMESTAMP. A Substack feed item carries no modification
// timestamp of any kind, and its publication date does not move when the post is
// edited — verified across 40 real items — so a timestamp physically cannot
// detect an edit. Change detection has to be content-derived.
//
// HASHED AFTER SANITIZATION, over exactly the values that would be written.
// "Hash equal" therefore means "the stored row is already identical to what we
// would write", which is a stronger and self-consistent invariant than "the feed
// text is unchanged". It also means tightening the sanitizer allowlist changes
// every hash and re-syncs every post on the next run. Hashing the raw feed HTML
// instead would leave old rows frozen at an older, weaker sanitizer forever.
// That is a security property, not an optimization.

import { createHash } from "node:crypto";

import { sanitizePostHtml, sanitizeText } from "./sanitize";

const TITLE_MAX = 512;
const DESCRIPTION_MAX = 500;
const AUTHOR_MAX = 255;
const SLUG_MAX = 96;

const sha256 = (value) => createHash("sha256").update(value).digest("hex");

const absolute = (url) => {
  try {
    const parsed = new URL(String(url));

    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.href : null;
  } catch {
    return null;
  }
};

// Deterministic and pure — the same input must always produce the same slug,
// because a slug that drifts is a broken inbound link.
const slugify = (value) =>
  String(value ?? "")
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX)
    .replace(/^-+|-+$/g, "");

// Substack's canonical form is /p/<slug>, which is the slug the author chose and
// the one their readers already saw. Everything after it is a fallback.
const slugCandidates = (sourceUrl, title, sourceId) => {
  const segments = new URL(sourceUrl).pathname.split("/").filter(Boolean);
  const afterP = segments[segments.indexOf("p") + 1];

  return [
    segments.includes("p") ? afterP : null,
    segments[segments.length - 1],
    title,
    sha256(sourceId).slice(0, 12),
  ];
};

const deriveSlug = (sourceUrl, title, sourceId) => {
  for (const candidate of slugCandidates(sourceUrl, title, sourceId)) {
    const slug = slugify(candidate);

    if (slug) return slug;
  }

  // Unreachable: the last candidate is 12 hex characters, which always
  // slugifies to itself. Kept so a future edit to the candidate list cannot
  // return undefined silently.
  return sha256(sourceId).slice(0, 12);
};

// Reads the first image out of OUR OWN sanitized output, not out of the feed:
// by this point every surviving src has already been forced to an absolute
// http(s) URL and every attribute value is escaped, so there is no untrusted
// markup left to mis-parse. `absolute` is applied again anyway.
const firstImageSrc = (html) => {
  const match = /<img\b[^>]*?\ssrc="([^"]*)"/i.exec(html);

  return match ? absolute(match[1]) : null;
};

// The hash covers exactly the mutable columns, as an ORDERED ARRAY of pairs
// rather than an object literal — nothing may depend on JS object key order (the
// same rule src/lib/realtime/README.md applies to room state). Deliberately
// excluded: `slug` (immutable after insert), `sourceId` (the key), `syncedAt`
// (derived from the write itself).
const hashPost = (post) =>
  sha256(
    JSON.stringify([
      ["title", post.title],
      ["description", post.description],
      ["contentHtml", post.contentHtml],
      ["publishedAt", post.publishedAt.toISOString()],
      ["coverImage", post.coverImage],
      ["sourceUrl", post.sourceUrl],
      ["author", post.author],
    ])
  );

export function normalizeItem(rawItem) {
  const item = rawItem ?? {};

  // #151 section 2 is explicit that identity is the feed's stable id, never the
  // title: a retitled post must update in place, not insert a duplicate.
  const sourceId = item.id || item.link || null;

  if (!sourceId) return { ok: false, reason: "item has no stable id and no link" };

  const sourceUrl = absolute(item.link) || absolute(item.id);

  if (!sourceUrl) return { ok: false, reason: "item has no absolute http(s) URL" };

  const title = sanitizeText(item.title, { maxLength: TITLE_MAX });

  if (!title) return { ok: false, reason: "item has no title" };

  // Never default to now(). A bogus date would pin the post to the top of the
  // blog forever, and it is silent — the post looks fine, it is just wrong.
  const publishedAt = new Date(item.published ?? "");

  if (Number.isNaN(publishedAt.getTime())) {
    return { ok: false, reason: "item has an unparseable publication date" };
  }

  const { html: contentHtml, embedsRemoved, imagesDropped } = sanitizePostHtml(item.contentEncoded);

  // No fallback to `description`: a post whose body is its one-line subtitle is
  // a broken post, not a synced one.
  if (!contentHtml.trim()) return { ok: false, reason: "item has no content after sanitization" };

  // The feed's attached media is the cover when it is an image (true on 40/40
  // real items); otherwise fall back to the first image in the body.
  const mediaIsImage = String(item.mediaType ?? "").startsWith("image/");
  const coverImage = (mediaIsImage ? absolute(item.mediaUrl) : null) ?? firstImageSrc(contentHtml);

  const post = {
    sourceId,
    slug: deriveSlug(sourceUrl, title, sourceId),
    title,
    description: sanitizeText(item.description, { maxLength: DESCRIPTION_MAX }) || null,
    contentHtml,
    publishedAt,
    coverImage,
    sourceUrl,
    author: sanitizeText(item.creator, { maxLength: AUTHOR_MAX }) || null,
  };

  return { ok: true, post: { ...post, contentHash: hashPost(post) }, embedsRemoved, imagesDropped };
}
