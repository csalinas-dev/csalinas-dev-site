// Substack ingestion. See ./README.md for the contract and the decisions.
//
// The normalized post shape, which is also the SubstackPost model's columns:
//
//   {
//     sourceId,     // the feed's stable id — the canonical Substack URL; identity, never the title
//     slug,         // local, assigned once at insert, NEVER rewritten
//     title,        // plain text
//     description,  // plain text or null (the Substack subtitle)
//     contentHtml,  // sanitized; see ./sanitize.js
//     publishedAt,  // Date
//     coverImage,   // absolute http(s) URL or null
//     sourceUrl,    // canonical Substack URL, for attribution and debugging
//     author,       // plain text or null
//     contentHash,  // sha256 of the mutable fields ABOVE, taken after sanitizing
//   }

export { getFeedUrl } from "./config";
export { syncSubstackPosts } from "./sync";
