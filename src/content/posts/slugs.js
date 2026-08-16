/**
 * The slugs the MDX posts own, as plain data.
 *
 * AN MDX POST ALWAYS OWNS ITS SLUG. These are reserved names in the
 * `/blog/<slug>` namespace: the Substack sync will never assign one (it skips a
 * reserved candidate exactly as it skips a taken one and moves on to `-2`,
 * `-3`…), and if a row somehow already holds one the read layer resolves that
 * URL to the MDX post and drops the synced row from every listing. The rule and
 * its remedy are in CLAUDE.md and src/lib/blog/README.md.
 *
 * Adding a post to ./index.js means adding its slug here too — index.js throws
 * at import if the two drift, so a slug can never be quietly un-reserved.
 *
 * NO IMPORTS, EVER. This is the one module about posts that both plain `node`
 * (the .agent verify scripts) and the ingestion layer can load: ./index.js
 * imports `.mdx`, which neither can.
 */
export const MDX_SLUGS = Object.freeze([
  "goldwater-bank",
  "hashtag",
  "wordleverse",
]);
