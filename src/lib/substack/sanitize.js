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

// A srcset is a comma-separated candidate list. Kept only if EVERY candidate is
// absolute, rather than trying to repair a partly-relative list.
const srcsetIsAbsolute = (srcset) =>
  String(srcset)
    .split(",")
    .map((candidate) => candidate.trim().split(/\s+/)[0])
    .filter(Boolean)
    .every((url) => absolute(url) !== null);

// Link hygiene applied to every surviving <a>: this is untrusted user-generated
// content pointing off-site.
const LINK_REL = "noopener noreferrer nofollow ugc";

// The validators an attribute may be checked with. Each takes the raw attribute
// value and returns the value to emit, or null to reject it.
const URL_VALIDATORS = {
  url: (value) => absolute(value),
  // <a href> is the one place a mail link belongs.
  link: (value) => absolute(value) ?? (isMailto(value) ? String(value).trim() : null),
  srcset: (value) => (srcsetIsAbsolute(value) ? String(value) : null),
};

// Every attribute name that can carry a URL, whether or not this config allows
// it anywhere. Two jobs:
//
//   1. It is the registry the import-time invariant below polices: a name on
//      this list may only be allowlisted through an element's `urls` (i.e. with
//      a validator), never through its plain `attributes`.
//   2. It is the scheme-check list handed to sanitize-html, so the second layer
//      of defence covers every URL attribute rather than a hand-copied subset —
//      including action/formaction/data/poster/background (CVE-2026-53606),
//      which no element here allows in the first place.
const URL_BEARING = new Set([
  "href", "src", "srcset", "cite", "action", "formaction", "data", "poster",
  "background", "longdesc", "usemap", "profile", "manifest", "codebase",
  "lowsrc", "dynsrc", "ping", "xlink:href",
]);

// THE ALLOWLIST, AS DATA. Both `allowedAttributes` and the `transformTags` that
// police URLs are DERIVED from this one table, and that is deliberate.
//
// This shape replaced three hand-written transforms, because hand-writing them
// shipped a real hole: `source` was allowlisted with `srcset` while the
// absolute-URL check lived inside the `img` transform, so `javascript:`, `data:`
// and `//evil` died on the scheme check but a scheme-LESS `srcset="/admin/x 1x"`
// had nothing to trip over and survived — and inside <picture> the browser
// prefers the <source> over the <img>, so a visitor's browser would have issued
// a same-origin GET on a path a third party chose, with `imagesDropped` still
// reporting 0. Three elements had the trap closed and the fourth did not, which
// is what a fourth hand-written transform guarantees for the fifth element.
//
// Per element:
//   attributes — plain, inert attributes, copied through when present.
//   urls       — attribute -> validator name. These are the only attributes
//                that may carry a URL, and each is routed through its validator.
//   required   — URL attributes the element cannot exist without: if one fails,
//                the whole element is dropped rather than left half-formed.
//   onDrop     — the counter that drop increments, so it reaches the sync report
//                instead of vanishing silently.
//   force      — attributes stamped onto the element when a URL survived.
const ELEMENTS = {
  a: {
    attributes: ["title"],
    urls: { href: "link" },
    // No `required`: a link with no usable href keeps its text and loses only
    // the attribute. Dropping the element would eat words out of a sentence.
    force: { rel: LINK_REL, target: "_blank" },
  },
  img: {
    attributes: ["alt", "title", "width", "height", "sizes"],
    urls: { src: "url", srcset: "srcset" },
    required: ["src"],
    onDrop: "imagesDropped",
    force: { loading: "lazy" },
  },
  source: {
    attributes: ["sizes", "type"],
    urls: { srcset: "srcset" },
    // A <source> with no usable srcset is not merely inert: leaving it inside a
    // <picture> would suppress nothing but tell the operator nothing either.
    // Dropping it lets <picture> fall back to the <img>, which has been through
    // the same check.
    required: ["srcset"],
    onDrop: "imagesDropped",
  },
  th: { attributes: ["colspan", "rowspan", "scope"] },
  td: { attributes: ["colspan", "rowspan"] },
};

// What a dropped element degrades to. sanitize-html has no "delete this
// element" transform, so a transform that wants an element gone has to name
// something the allowlist will discard — and that something must be VOID.
// Verified against 2.17.7: on the close tag the library only suppresses
// `</name>` for names in its own `selfClosing` list ('img', 'br', 'hr', 'area',
// 'base', 'basefont', 'input', 'link', 'meta', 'col'), so degrading a void
// <img>/<source> to a non-void <span> emitted a stray `</span>` into the stored
// HTML whenever a sibling followed it in the same parent. `col` is on that list,
// is absent from ALLOWED_TAGS so it is discarded, and is absent from
// nonTextTags so it swallows nothing around it.
const DROPPED_ELEMENT = "col";

// Contents discarded, not just the tag — and one list, used by BOTH
// sanitizePostHtml and sanitizeText, because two copies drift and the copy that
// drifts is the one nobody re-attacks. `xmp` and `textarea` are here
// specifically because they are the raw-text elements behind CVE-2026-44990 and
// the 2.17.6 mXSS; `svg` because of the 2.17.7 <animate> bypass;
// `noembed`/`noframes`/`plaintext`/`listing` for the same reason as `xmp` —
// 2.17.7 keeps their contents inert, but without this they escape the tag and
// surface as visible prose in the middle of the article.
const NON_TEXT_TAGS = [
  "script", "style", "textarea", "option", "noscript",
  "xmp", "iframe", "svg", "math", "template",
  "noembed", "noframes", "plaintext", "listing",
];

const ALLOWED_TAGS = [
  "p", "br", "hr",
  // h1 is transformed to h2 below, not allowed: the page already has one.
  "h2", "h3", "h4", "h5", "h6",
  "blockquote", "ul", "ol", "li", "dl", "dt", "dd",
  "strong", "em", "b", "i", "u", "s", "sup", "sub", "small", "mark",
  "code", "pre",
  "a", "img", "figure", "figcaption", "picture", "source",
  "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption",
];

// THE STRUCTURAL GUARANTEE. Lists the reasons an element table is unsafe, empty
// when it is fine. The module refuses to load on a non-empty result, so a
// URL-bearing attribute cannot be allowlisted without a validator — which is
// precisely the mistake that shipped `<source srcset>` unchecked, and precisely
// the mistake a comment saying "remember to add a transform" does not catch.
//
// Exported and pure so the verify script can hand it deliberately broken tables
// and prove the guard is real rather than decorative. Nothing else should call
// it.
export const auditAllowlist = (elements = ELEMENTS, allowedTags = ALLOWED_TAGS) => {
  const problems = [];

  if (allowedTags.includes(DROPPED_ELEMENT)) {
    problems.push(`<${DROPPED_ELEMENT}> is what a dropped element degrades to, so allowing it would make every drop visible instead of gone.`);
  }

  for (const [tag, element] of Object.entries(elements)) {
    if (!allowedTags.includes(tag)) problems.push(`<${tag}> declares attributes but is not in ALLOWED_TAGS.`);

    for (const name of element.attributes ?? []) {
      if (URL_BEARING.has(name)) {
        problems.push(
          `<${tag} ${name}> is a URL-bearing attribute, so it must be declared under \`urls\` with a ` +
            "validator, not under `attributes` — otherwise a scheme-less relative URL survives the " +
            "scheme check (it has no scheme to fail on) and resolves against this site's own origin."
        );
      }
    }

    for (const [name, validator] of Object.entries(element.urls ?? {})) {
      if (!URL_BEARING.has(name)) {
        problems.push(`<${tag} ${name}> has a URL validator but is missing from URL_BEARING; add it there so that registry stays complete.`);
      }

      if (!URL_VALIDATORS[validator]) problems.push(`<${tag} ${name}> names an unknown validator ${JSON.stringify(validator)}.`);
    }

    for (const name of element.required ?? []) {
      if (!element.urls?.[name]) problems.push(`<${tag}> requires ${name}, which is not one of its URL attributes.`);
      if (!element.onDrop) problems.push(`<${tag}> drops the element when ${name} fails but names no counter — a silent drop never reaches the sync report.`);
    }
  }

  return problems;
};

// Import time, not first call: a misconfigured allowlist must be a build/boot
// failure, never a quietly weaker sanitizer.
const allowlistProblems = auditAllowlist();

if (allowlistProblems.length) {
  throw new Error(`src/lib/substack/sanitize.js: ${allowlistProblems.join(" ")}`);
}

// GOTCHA: allowedAttributes is applied AFTER transformTags, so an attribute a
// transform adds is silently stripped unless it also appears here. `rel` and
// `target` on `a` are exactly that case — omit them and links still render
// perfectly, just with no rel. Deriving the map from the same table that
// declares `force` is what keeps the two in step.
const ALLOWED_ATTRIBUTES = Object.fromEntries(
  Object.entries(ELEMENTS).map(([tag, element]) => [
    tag,
    [
      ...Object.keys(element.urls ?? {}),
      ...(element.attributes ?? []),
      ...Object.keys(element.force ?? {}),
    ],
  ])
);

// One generated transform per element that can carry a URL. Because it is
// generated, there is no element for which somebody can forget to write it.
const makeTransform = (tag, element, counters) => (unusedTagName, attribs) => {
  const next = {};
  let urlsKept = 0;

  for (const [name, validator] of Object.entries(element.urls)) {
    const value = attribs[name] ? URL_VALIDATORS[validator](attribs[name]) : null;

    if (value) {
      next[name] = value;
      urlsKept += 1;
      continue;
    }

    if (element.required?.includes(name)) {
      counters[element.onDrop] += 1;

      return { tagName: DROPPED_ELEMENT, attribs: {} };
    }
  }

  for (const name of element.attributes ?? []) {
    if (attribs[name]) next[name] = attribs[name];
  }

  // Forced attributes only mean anything on an element whose URL survived:
  // rel/target on an href-less <a> is noise, and loading=lazy on a dropped image
  // is moot.
  return { tagName: tag, attribs: urlsKept ? { ...next, ...element.force } : next };
};

// The config is built per call so the counters it closes over belong to that
// call — two concurrent sanitizations must not share a tally.
const makeConfig = (counters) => ({
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: ALLOWED_ATTRIBUTES,

  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesAppliedToAttributes: [...URL_BEARING],
  allowProtocolRelative: false,
  disallowedTagsMode: "discard",

  nonTextTags: NON_TEXT_TAGS,

  transformTags: {
    h1: "h2",

    ...Object.fromEntries(
      Object.entries(ELEMENTS)
        .filter(([, element]) => element.urls)
        .map(([tag, element]) => [tag, makeTransform(tag, element, counters)])
    ),

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
    // to the same URL and the removal is counted into the sync report. It is
    // not in ELEMENTS because it is not an allowed element at all: its src is
    // never emitted as a src, only as the href of the replacement link — and
    // that goes through the same validator.
    iframe: (unusedTagName, attribs) => {
      counters.embedsRemoved += 1;

      const src = attribs.src ? URL_VALIDATORS.url(attribs.src) : null;

      if (!src) return { tagName: "p", attribs: {}, text: "" };

      return {
        tagName: "a",
        attribs: { href: src, rel: LINK_REL, target: "_blank" },
        text: `Embedded content on ${new URL(src).hostname}`,
      };
    },
  },
});

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
    nonTextTags: NON_TEXT_TAGS,
  });

  const collapsed = stripped.replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();

  return collapsed.length > maxLength ? collapsed.slice(0, maxLength).trim() : collapsed;
}
