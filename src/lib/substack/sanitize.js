// The security boundary.
//
// Everything here operates on markup written by a third party and destined to be
// injected into this site's own origin. Treat any change to this file as a
// security change: re-run `node .agent/scripts/verify-substack-sync.mjs`, which
// carries the payload battery this config was designed against.
//
// Library choice — `sanitize-html`, floor `^2.17.7`, and the floor is not
// arbitrary. Five sanitizer bypasses were fixed in this package during 2026:
//
//   CVE-2026-44990 (2.17.4)  <xmp> raw-text passthrough, default config
//   CVE-2026-40186 (2.17.3)  allowedTags bypass via entity-decoded nonTextTags
//   CVE-2026-53606 (2.17.5)  javascript: via action/formaction/data/poster/background
//   2.17.6                   mXSS via </textarea/> and raw-text elements in SVG/MathML
//   2.17.7                   SVG animation (<animate attributeName="href">) scheme bypass
//
// The standalone apostrophecms/sanitize-html GitHub repo reads "archived,
// read-only" and a widely-linked issue there claims the package is abandoned and
// the CVEs will never be fixed. BOTH ARE STALE. The package moved into the
// ApostropheCMS monorepo (apostrophecms/apostrophe/tree/main/packages/
// sanitize-html — the `repository` field on npm) and ships monthly. Do not swap
// the library on the strength of that issue; check npm.
//
// DOMPurify was rejected: server-side it needs jsdom, a very large runtime
// dependency for one string transform, and its edge is defending a LIVE DOM
// against mXSS whereas this output is stored and re-injected. rehype-sanitize
// was rejected: three packages and a unified pipeline for one function call,
// and it needs the same bespoke allowlist anyway.

import sanitizeHtml from "sanitize-html";

// Relative URLs are the trap this config exists to close twice over. A bare
// `href="/admin/delete"` or `src="x"` in third-party content carries NO scheme,
// so scheme checking never fires on it — and once stored and rendered it
// resolves against csalinas.dev. Everything that survives must be absolute
// http(s).
const absolute = (url) => {
  try {
    const parsed = new URL(String(url));

    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.href : null;
  } catch {
    return null;
  }
};

const isMailto = (url) => {
  try {
    return new URL(String(url)).protocol === "mailto:";
  } catch {
    return false;
  }
};

// Link hygiene applied to every surviving <a>: this is untrusted user-generated
// content pointing off-site.
const LINK_REL = "noopener noreferrer nofollow ugc";

// The config is built per call so the counters it closes over belong to that
// call — two concurrent sanitizations must not share a tally.
const makeConfig = (counters) => ({
  allowedTags: [
    "p", "br", "hr",
    // h1 is transformed to h2 below, not allowed: the page already has one.
    "h2", "h3", "h4", "h5", "h6",
    "blockquote", "ul", "ol", "li", "dl", "dt", "dd",
    "strong", "em", "b", "i", "u", "s", "sup", "sub", "small", "mark",
    "code", "pre",
    "a", "img", "figure", "figcaption", "picture", "source",
    "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption",
  ],

  // GOTCHA: allowedAttributes is applied AFTER transformTags, so an attribute a
  // transform adds is silently stripped unless it is also listed here. `rel` and
  // `target` on `a` are exactly that case — omit them and links still render
  // perfectly, just with no rel. Check the output for rel=, do not assume.
  allowedAttributes: {
    a: ["href", "title", "rel", "target"],
    img: ["src", "srcset", "sizes", "alt", "title", "width", "height", "loading"],
    source: ["srcset", "sizes", "type"],
    th: ["colspan", "rowspan", "scope"],
    td: ["colspan", "rowspan"],
  },

  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesAppliedToAttributes: ["href", "src", "cite", "srcset"],
  allowProtocolRelative: false,
  disallowedTagsMode: "discard",

  // Contents discarded, not just the tag. `xmp` and `textarea` are on this list
  // specifically because they are the raw-text elements behind CVE-2026-44990
  // and the 2.17.6 mXSS; `svg` because of the 2.17.7 <animate> bypass.
  nonTextTags: [
    "script", "style", "textarea", "option", "noscript",
    "xmp", "iframe", "svg", "math", "template",
  ],

  transformTags: {
    h1: "h2",

    a: (tagName, attribs) => {
      const href = attribs.href ? absolute(attribs.href) : null;
      const mail = !href && attribs.href && isMailto(attribs.href) ? String(attribs.href).trim() : null;
      const target = href || mail;

      // No usable href: keep the link text, drop the attribute. Dropping the
      // whole element would silently eat words out of a sentence.
      if (!target) return { tagName: "a", attribs: {} };

      const next = { href: target, rel: LINK_REL, target: "_blank" };

      if (attribs.title) next.title = attribs.title;

      return { tagName: "a", attribs: next };
    },

    img: (tagName, attribs) => {
      const src = attribs.src ? absolute(attribs.src) : null;

      if (!src) {
        counters.imagesDropped += 1;

        // sanitize-html has no "delete this element" transform, so degrade it to
        // an inert element the allowlist discards.
        return { tagName: "span", attribs: {} };
      }

      const next = { src, loading: "lazy" };

      for (const key of ["alt", "title", "width", "height", "sizes"]) {
        if (attribs[key]) next[key] = attribs[key];
      }

      // srcset is a comma-separated list of candidates; keep it only if every
      // candidate is absolute http(s), rather than trying to repair it.
      if (attribs.srcset && srcsetIsAbsolute(attribs.srcset)) next.srcset = attribs.srcset;

      return { tagName: "img", attribs: next };
    },

    // EVERY iframe is removed — none are allowed, by host or otherwise. An
    // iframe is a third-party origin executing script inside this page, which
    // defeats the point of sanitizing; a host allowlist is a URL-parsing
    // problem and URL parsing is precisely where this library's 2026 CVEs
    // lived; and this site's posture is to avoid third-party requests at all
    // (src/lib/qr.js is a from-scratch QR encoder written so that one view
    // makes none). #151 permits embeds "unless explicitly supported" and
    // nothing is explicitly supported yet. Allowing one later is additive; a
    // bad allow now is live XSS.
    //
    // But removal must not silently eat content, so the iframe becomes a link
    // to the same URL and the removal is counted into the sync report.
    iframe: (tagName, attribs) => {
      counters.embedsRemoved += 1;

      const src = attribs.src ? absolute(attribs.src) : null;

      if (!src) return { tagName: "p", attribs: {}, text: "" };

      return {
        tagName: "a",
        attribs: { href: src, rel: LINK_REL, target: "_blank" },
        text: `Embedded content on ${new URL(src).hostname}`,
      };
    },
  },
});

const srcsetIsAbsolute = (srcset) =>
  String(srcset)
    .split(",")
    .map((candidate) => candidate.trim().split(/\s+/)[0])
    .filter(Boolean)
    .every((url) => absolute(url) !== null);

// Sanitizes an article body. Returns the safe HTML plus what was removed, so the
// sync report can tell an operator that a post lost an embed or an image rather
// than leaving it to be noticed on the page.
export function sanitizePostHtml(html) {
  const counters = { embedsRemoved: 0, imagesDropped: 0 };

  if (typeof html !== "string" || !html.trim()) {
    return { html: "", ...counters };
  }

  return { html: sanitizeHtml(html, makeConfig(counters)), ...counters };
}

// Strips a value to plain text. Used for title, description and author:
// `description` is rendered into <meta> and card markup by #153 and must be
// text, and "it happens to be plain text in the sample feed" is not a guarantee
// about the next post.
//
// Entities: sanitize-html strips tags but re-escapes the surviving text, so a
// title containing "&" comes back as "&amp;" and would render literally. Only
// "&amp;" is decoded back, and "&lt;"/"&gt;" are deliberately left encoded, so
// the returned string provably contains no "<" or ">" at all. That keeps the
// value safe even if a future consumer wrongly hands it to
// dangerouslySetInnerHTML — a character reference can only ever produce a text
// node, never a tag. The cost is that a literal "<" in a title survives as
// "&lt;", which is rare and errs in the safe direction.
export function sanitizeText(value, { maxLength = 512 } = {}) {
  if (value == null) return "";

  const stripped = sanitizeHtml(String(value), {
    allowedTags: [],
    allowedAttributes: {},
    disallowedTagsMode: "discard",
    nonTextTags: ["script", "style", "textarea", "option", "noscript", "xmp", "iframe", "svg", "math", "template"],
  });

  const collapsed = stripped.replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();

  return collapsed.length > maxLength ? collapsed.slice(0, maxLength).trim() : collapsed;
}
