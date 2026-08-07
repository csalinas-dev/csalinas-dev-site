"use client";

import NextImage from "next/image";
import { Box, styled } from "@mui/material";

export const Links = styled(Box)`
  display: flex;
  justify-content: space-between;
  align-items: center;

  a {
    display: inline-flex;
    align-items: center;
    gap: 0.75rem;
  }
`;

export const Image = styled(NextImage)`
  aspect-ratio: 3 / 2;
  border-radius: 2rem;
  box-shadow: 0 8px 10px 1px rgba(0, 0, 0, 0.14),
    0 3px 14px 2px rgba(0, 0, 0, 0.12), 0 5px 5px -3px rgba(0, 0, 0, 0.2);
  object-fit: cover;
  user-select: none;
  width: 100%;
`;

export const Category = styled("span")`
  color: var(--comment);

  &:before {
    content: "// ";
  }
`;

export const Tags = styled("div")`
  display: flex;
  flex-flow: row wrap;
  gap: 0.75rem;
`;

export const Tag = styled("span")`
  color: var(--var);
  font-size: 1rem;

  &:before {
    content: "#";
  }
`;

// The prose theme. Section forces font-size: 1.5rem !important on itself, which
// the article would otherwise inherit — hence its own explicit size.
export const Article = styled("article")`
  align-self: center;
  color: var(--foreground);
  font-size: 1.125rem;
  line-height: 1.7;
  max-width: 72ch;

  h2 {
    color: var(--comment);

    &:before {
      content: "// ";
    }
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
    border-left: 3px solid var(--module);
    color: var(--muted);
    margin-left: 0;
    padding-left: 1rem;
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

  pre {
    background: var(--absentBackground);
    border: 1px solid var(--selectionBackground);
    border-radius: 0.75rem;
    font-size: 0.95rem;
    line-height: 1.5;
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

  img {
    border-radius: 1rem;
    height: auto;
    max-width: 100%;
  }
`;
