"use client";

import NextImage from "next/image";
import { Box, styled } from "@mui/material";

import { Link, Section } from "@/components";

// Everything below sets its own font-size on purpose. Section forces
// `font-size: 1.5rem !important` on itself (src/components/Section.jsx) and
// descendants inherit it, so any text element that stays quiet renders at 24px.

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
  grid-template-columns: 1fr;

  @media (min-width: 900px) {
    grid-template-columns: 150px 1fr;
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
  line-height: 0.98;
  margin: 0;

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
`;

export const Hero = styled(NextImage)`
  border-radius: 12px;
  height: 200px;
  margin: 52px 0 56px;
  object-fit: cover;
  user-select: none;
  width: 100%;

  @media (min-width: 900px) {
    height: 300px;
  }
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

export const TocEntry = styled("a")`
  align-items: center;
  color: var(--muted);
  display: flex;
  gap: 8px;
  text-decoration: none;

  &:before {
    background: currentColor;
    content: "";
    flex: none;
    height: 1px;
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
export const Article = styled("article")`
  color: var(--foreground);
  font-size: 17px;
  line-height: 1.75;
  max-width: 68ch;

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

  table {
    border-collapse: collapse;
    width: 100%;
  }

  th,
  td {
    border-bottom: 1px solid var(--selectionBackground);
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
export const FooterLink = styled(Link)`
  display: flex;
  flex-flow: column nowrap;
  gap: 4px;
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
