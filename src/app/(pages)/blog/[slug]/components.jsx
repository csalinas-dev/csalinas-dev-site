"use client";

import NextImage from "next/image";
import { Box, styled } from "@mui/material";

import { Link, Section } from "@/components";

// Everything below sets its own font-size on purpose. Section forces
// `font-size: 1.5rem !important` on itself (src/components/Section.jsx) and
// descendants inherit it, so any text element that stays quiet renders at 24px.

// The two values #132 exists to tune. Deliberately constants: Christopher is
// reacting to rendered pixels, so "more" or "less" should be a one-line edit.

// The Grid below already uses 48px as its gutter. Reusing it makes the space
// under the header equal the gap between the metadata rail and the title, so
// the header joins the existing rhythm instead of introducing a new number.
const HEADER_SPACE = "48px";

// Sono's natural line box is 1.197em (measured at 66px/800: ascent 60 +
// descent 19 = 79px), so the shipped 0.98 was 0.22em of *negative* leading —
// consecutive lines overlapped their glyph boxes. Every post title wraps
// (4/3/2 lines at 1440, up to 6 at 390), so this is the title block's main
// visual, not an edge case. 1.1 about doubles the white between lines
// (8.7px -> 16.6px at 66px) while staying under the font's natural leading,
// which is too airy for a four-line display block.
const TITLE_LINE_HEIGHT = 1.1;

// The `&&` doubles the class in the selector (.css-x.css-x), which outranks
// Section's own single-class `padding: 2rem`. Both are equal specificity
// otherwise and would be decided by emotion's insertion order — and Section's
// inner Container renders *after* this wrapper, so it would win.
export const Page = styled(Section)`
  && {
    gap: 0;
    padding: 24px;

    @media (min-width: 900px) {
      padding: 56px 64px 64px;
    }
  }
`;

// The links row above the grid. Same links and behaviour as the old `Links`.
export const Header = styled(Box)`
  align-items: center;
  display: flex;
  font-size: 12.5px;
  justify-content: space-between;
  margin-bottom: ${HEADER_SPACE};

  a {
    align-items: center;
    display: inline-flex;
    gap: 0.75rem;
  }
`;

// Used twice: once for the title block, once for the article body inside
// PostBody. `align-items: start` is load-bearing — a grid item stretches to the
// row height by default, which would make the sticky TOC in the left cell as
// tall as the article and stop it sticking.
export const Grid = styled("div")`
  align-items: start;
  display: grid;
  gap: 48px;
  grid-template-columns: minmax(0, 1fr);

  /* minmax(0, …) and this floor are the same statement made at both ends: a
     grid track is min-content sized by default and a grid item's automatic
     minimum size is its min-content width, so ONE unbreakable run of characters
     inside the article — a pasted credential, a commit hash, a twelve-column
     table — inflates the whole column and with it the page. Without it the
     symptom is not "one line overflows": every ordinary paragraph of the post
     is laid out at the width of that one token. The article's grid item is an
     unstyled <div> in PostBody.jsx, so the floor has to be set from here. */
  > * {
    min-width: 0;
  }

  @media (min-width: 900px) {
    grid-template-columns: 150px minmax(0, 1fr);
  }
`;

export const Rail = styled("div")`
  display: flex;
  flex-flow: column nowrap;
  font-size: 12.5px;
  gap: 10px;
`;

export const RailCategory = styled("span")`
  color: var(--comment);

  &:before {
    content: "// ";
  }
`;

export const ReadTime = styled("span")`
  color: var(--muted);
`;

// One tag per line, unlike the index's wrapping row.
export const RailTags = styled("div")`
  display: flex;
  flex-flow: column nowrap;
  gap: 4px;
`;

export const RailTag = styled("span")`
  color: var(--var);

  &:before {
    content: "#";
  }
`;

// Not @/components/Title: that one is align-self: center at 5rem and is still
// what the /blog index renders.
export const PostTitle = styled("h1")`
  color: var(--foreground);
  font-size: 40px;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: ${TITLE_LINE_HEIGHT};
  margin: 0;
  /* A synced post's title is third-party text too, and it is rendered here
     rather than inside <Article> — at 66px, one unbreakable token is 1500px
     wide on a phone. */
  overflow-wrap: anywhere;

  @media (min-width: 900px) {
    font-size: 66px;
  }
`;

export const TitleColon = styled("span")`
  color: var(--comment);
`;

export const TitleTail = styled("span")`
  color: var(--muted);
  display: block;
  font-weight: 300;
`;

export const Description = styled("p")`
  color: var(--muted);
  font-size: 19px;
  line-height: 1.6;
  max-width: 52ch;
  /* Third-party text, same as the title above it. */
  overflow-wrap: anywhere;
`;

// One declaration block, two elements. An MDX post's cover is a StaticImageData
// object and goes through next/image; a synced post's is a remote URL string and
// renders as a plain <img> (no `remotePatterns` coupling to a third party's CDN
// hostname — see src/lib/blog/README.md). Sharing the CSS is what stops the two
// heroes drifting apart.
const HERO_CSS = `
  aspect-ratio: 3 / 1;
  border-radius: 12px;
  height: auto;
  margin: 52px 0 56px;
  object-fit: cover;
  user-select: none;
  width: 100%;
`;

export const Hero = styled(NextImage)`
  ${HERO_CSS}
`;

export const RemoteHero = styled("img")`
  ${HERO_CSS}
`;

// The nav is position: sticky; top: 0 (src/components/Nav.jsx), so the spec's
// "top: 20px" is measured from below it. 40px is the nav's own height derived
// from its rules there — a 20px logo, 0.5rem of padding above and below, and a
// 1px bottom border — plus the spec's 20px offset.
export const Toc = styled("details")`
  font-size: 12.5px;

  /* The mockup shows this as a "CONTENTS" kicker above the entries, which the
     written spec does not mention. It carries the same uppercase treatment the
     spec gives article h2s so the two read as one idiom. Below 900px it is also
     the disclosure control for the collapsed <details>. */
  summary {
    color: var(--comment);
    cursor: pointer;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  @media (min-width: 900px) {
    position: sticky;
    top: 60px;

    /* Open and non-collapsible up here, so the summary is a label rather than a
       control — no disclosure triangle, no pointer affordance. */
    summary {
      cursor: default;
      list-style: none;
    }

    summary::-webkit-details-marker {
      display: none;
    }
  }
`;

// Holds the left column open when a post has no headings, so the body keeps its
// 150px 1fr shape. Below 900px the grid is a single column and an empty cell
// would only add a dead 48px gap above the article.
export const TocSpacer = styled("div")`
  display: none;

  @media (min-width: 900px) {
    display: block;
  }
`;

export const TocList = styled("div")`
  display: flex;
  flex-flow: column nowrap;
  gap: 10px;
  margin-top: 12px;

  @media (min-width: 900px) {
    margin-top: 0;
  }
`;

// The label is a heading lifted out of the article by PostBody, so on a synced
// post this is third-party text too — and it is the narrowest place any of it
// lands: a 150px rail, of which the rule and the gap take 20px. `min-width: 0`
// on the Grid child pins the *track*; it does nothing for the text, which is an
// anonymous flex item here whose automatic minimum size is its own min-content
// width. One unbreakable run therefore paints straight out of the rail, across
// the article at 1200px and off the page at ~145 characters.
//
// `align-items: start` rather than `center`: once the label may wrap it usually
// does — the entries are whole sentences in a 130px column — and a rule centred
// against a four-line block reads as belonging to no line at all. The offset
// puts it on the first line's optical centre; `1lh` is the entry's own line box,
// so it tracks the font-size instead of being a number to re-tune.
export const TocEntry = styled("a")`
  align-items: start;
  color: var(--muted);
  display: flex;
  gap: 8px;
  line-height: 1.4;
  min-width: 0;
  overflow-wrap: anywhere;
  text-decoration: none;

  &:before {
    background: currentColor;
    content: "";
    flex: none;
    height: 1px;
    margin-top: calc((1lh - 1px) / 2);
    width: 12px;
  }

  &.active {
    color: var(--function);

    &:before {
      width: 24px;
    }
  }
`;

// z-index 5001 because the nav is sticky at top: 0 with z-index 5000 — anything
// lower is painted underneath it and never seen.
export const Progress = styled("div")`
  background: linear-gradient(90deg, var(--comment), var(--component));
  height: 3px;
  left: 0;
  position: fixed;
  top: 0;
  z-index: 5001;
`;

// The prose theme. Section forces font-size: 1.5rem !important on itself, which
// the article would otherwise inherit — hence its own explicit size.
//
// It also renders markup nobody on this side wrote. A synced body is ordinary
// newsletter content — a pasted JWT, a commit hash, a wallet address, a
// hyphen-free URL, a metrics table — and all of it survives sanitize.js intact,
// correctly: narrowing what a visitor's own writing may contain is the wrong
// lever for a layout bug. So the theme has to survive content the author did not
// choose. Measured by .agent/scripts/verify-blog-overflow.mjs at 1200 and 430.
export const Article = styled("article")`
  color: var(--foreground);
  font-size: 17px;
  line-height: 1.75;
  max-width: 68ch;
  /* anywhere, not break-word: only anywhere also shrinks the min-content width,
     and it is the min-content width that inflates the grid track. */
  overflow-wrap: anywhere;
  /* The backstop for what wrapping cannot fix — forty nested lists are 1600px
     of indentation whatever the words do. clip rather than hidden or auto: it
     creates no scroll container and no block formatting context, so margins
     still collapse through the article exactly as they did and the MDX posts'
     measured geometry does not move. */
  overflow-x: clip;

  > p:first-of-type::first-letter {
    color: var(--comment);
    float: left;
    font-size: 60px;
    font-weight: 700;
    line-height: 0.85;
    margin: 4px 14px 0 0;
  }

  h2 {
    color: var(--comment);
    font-size: 15px;
    font-weight: 600;
    letter-spacing: 0.1em;
    margin: 44px 0 18px;
    /* Clears the sticky nav when a TOC entry jumps to this heading. Same 60px
       the TOC sticks at. */
    scroll-margin-top: 60px;
    text-transform: uppercase;
  }

  h3 {
    color: var(--function);
  }

  h4 {
    color: var(--type);
  }

  strong {
    color: var(--var);
  }

  em {
    color: var(--regex);
  }

  a {
    color: var(--component);
  }

  blockquote {
    background: var(--absentBackground);
    border-left: none;
    border-radius: 10px;
    color: var(--function);
    font-size: 22px;
    line-height: 1.45;
    margin-left: 0;
    padding: 26px 30px;
  }

  li::marker {
    color: var(--parenthesis);
  }

  hr {
    border: 0;
    border-top: 1px solid var(--selectionBackground);
  }

  code {
    background: var(--selectionBackground);
    border-radius: 0.25rem;
    color: var(--string);
    font-size: 0.9em;
    padding: 0.1em 0.35em;
  }

  .code-block {
    border: 1px solid var(--selectionBackground);
    border-radius: 10px;
    overflow: hidden;
  }

  .code-block-bar {
    align-items: center;
    border-bottom: 1px solid var(--selectionBackground);
    display: flex;
    font-size: 12px;
    justify-content: space-between;
    padding: 8px 14px;
  }

  .code-block-name {
    color: var(--muted);
  }

  .copy {
    background: none;
    border: 0;
    color: var(--const);
    cursor: pointer;
    font: inherit;
    padding: 0;
  }

  pre {
    background: var(--codeBackground);
    border: 0;
    border-radius: 0;
    font-size: 13px;
    line-height: 1.6;
    margin: 0;
    overflow-x: auto;
    padding: 1rem 1.25rem;
  }

  pre code {
    background: none;
    color: inherit;
    padding: 0;
  }

  /* A table is the one block wrapping cannot rescue: its width is the sum of
     its columns. Let it scroll inside the article rather than push the article
     past the page — display: block is what makes overflow-x apply at all, since
     it is ignored on display: table. The visible cost is that a table
     narrower than the column no longer stretches to fill it; no MDX post has a
     table, and a twelve-column synced one reads far better scrollable at 79px a
     column than squeezed into 32px on a phone. */
  table {
    border-collapse: collapse;
    display: block;
    overflow-x: auto;
    width: 100%;
  }

  /* Cells opt back out of the article's overflow-wrap: anywhere. A table's width
     is the sum of its columns' min-content widths, and if a cell may break
     mid-word that is a couple of characters a column: the twelve-column table
     then squeezes to 32px columns and "Metric 0" wraps to four lines, which
     fits the page and cannot be read. Breaking words normally makes it wider
     than the article instead, which is what the scroll above is for. */
  th,
  td {
    border-bottom: 1px solid var(--selectionBackground);
    overflow-wrap: normal;
    padding: 0.5rem;
    text-align: left;
  }

  th {
    color: var(--type);
  }

  figure {
    margin: 32px 0;
  }

  figure img,
  img {
    border-radius: 10px;
    height: auto;
    max-width: 100%;
  }

  figcaption {
    color: var(--muted);
    font-size: 12px;
    margin-top: 8px;
  }

  .compare {
    background: var(--absentBackground);
    border-radius: 8px;
    display: grid;
    grid-template-columns: 1fr;
    overflow: hidden;

    /* The spec fixes the colours, divider and radius but not the inset; this
       matches the code block's header bar so the two read as one family. */
    > div {
      padding: 14px 18px;
    }

    > div + div {
      border-top: 1px solid var(--selectionBackground);
    }

    @media (min-width: 900px) {
      grid-template-columns: 1fr 1fr;

      > div + div {
        border-left: 1px solid var(--selectionBackground);
        border-top: 0;
      }
    }
  }

  .compare-before {
    color: var(--invalid);
  }

  .compare-after {
    color: var(--comment);
  }

  /* Footnotes come from remark-gfm. The attribute selector outranks the plain
     anchor rule above regardless of source order. */
  a[data-footnote-ref],
  a[data-footnote-backref] {
    color: var(--selector);
  }

  .footnotes {
    border-top: 1px solid var(--selectionBackground);
    font-size: 15px;
    margin-top: 40px;
    padding-top: 8px;
  }

  /* remark-gfm emits <h2 id="footnote-label">Footnotes</h2>. The 1px rule above
     already separates the section visually, so the heading is hidden from sight
     but kept for screen readers rather than inheriting the uppercase h2 scale. */
  .footnotes h2 {
    clip: rect(0 0 0 0);
    clip-path: inset(50%);
    height: 1px;
    margin: 0;
    overflow: hidden;
    position: absolute;
    white-space: nowrap;
    width: 1px;
  }
`;

export const Footer = styled("div")`
  border-top: 1px solid var(--selectionBackground);
  display: flex;
  gap: 24px;
  justify-content: space-between;
  margin-top: 64px;
  padding-top: 24px;
`;

// margin-left: auto keeps a lone "next" on the right when there is no previous.
//
// The label is the NEIGHBOURING post's title, so prev/next is a third surface
// rendering third-party text — and a flex item's automatic minimum size is its
// min-content width, so one unbreakable title here widens the footer, the page
// and every post that happens to sit beside that post in the ordering.
export const FooterLink = styled(Link)`
  display: flex;
  flex-flow: column nowrap;
  gap: 4px;
  min-width: 0;
  overflow-wrap: anywhere;
  text-decoration: none;

  &.next {
    margin-left: auto;
    text-align: right;
  }
`;

export const Kicker = styled("span")`
  color: var(--muted);
  font-size: 11px;
`;

export const FooterTitle = styled("span")`
  color: var(--function);
  font-size: 17px;
`;
