"use client";

import { styled } from "@mui/material";

import { Link } from "@/components";

export const Grid = styled("div")`
  display: grid;
  gap: 2rem;
  grid-template-columns: 1fr;

  @media (min-width: 720px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: 1200px) {
    grid-template-columns: repeat(3, 1fr);
  }
`;

export const Card = styled(Link)`
  border: 1px solid var(--selectionBackground);
  border-radius: 1.5rem;
  box-shadow: 0 8px 10px 1px rgba(0, 0, 0, 0.14),
    0 3px 14px 2px rgba(0, 0, 0, 0.12), 0 5px 5px -3px rgba(0, 0, 0, 0.2);
  color: inherit;
  display: flex;
  flex-flow: column nowrap;
  overflow: hidden;
  text-decoration: none;
  transition: transform ease-in-out 200ms, border-color ease-in-out 200ms;
  user-select: none;

  &:hover {
    border-color: var(--vscode);
    opacity: 1;
    transform: translateY(-4px);
  }

  &:hover img {
    transform: scale(1.04);
  }
`;

export const Cover = styled("div")`
  aspect-ratio: 16 / 9;
  overflow: hidden;
  position: relative;

  img {
    height: 100%;
    object-fit: cover;
    transition: transform ease-in-out 350ms;
    width: 100%;
  }
`;

export const CoverFallback = styled("div")`
  align-items: center;
  aspect-ratio: 16 / 9;
  background: var(--absentBackground);
  color: var(--comment);
  display: flex;
  font-size: 2rem;
  justify-content: center;
`;

// Section sets font-size: 1.5rem !important on itself, which descendants
// inherit — the card's own scale has to be re-established here.
export const Body = styled("div")`
  display: flex;
  flex: 1;
  flex-flow: column nowrap;
  font-size: 1rem;
  gap: 0.5rem;
  padding: 1.5rem;
`;

export const Category = styled("span")`
  color: var(--comment);
  font-size: 0.9rem;

  &:before {
    content: "// ";
  }
`;

// A synced post's title and excerpt are third-party text. The Card's own
// `overflow: hidden` already stops one unbreakable token from inflating the
// grid track (a grid item that clips has an automatic minimum size of 0), so the
// page never widens — but without this the token would be silently sliced off
// mid-character at the card's edge instead of wrapping.
export const CardTitle = styled("h2")`
  color: var(--function);
  font-size: 1.35rem;
  line-height: 1.3;
  margin: 0;
  overflow-wrap: anywhere;
`;

export const Excerpt = styled("p")`
  color: var(--muted);
  font-size: 1rem;
  margin: 0;
  overflow-wrap: anywhere;
`;

export const Tags = styled("div")`
  display: flex;
  flex-flow: row wrap;
  gap: 0.5rem;
`;

export const Tag = styled("span")`
  color: var(--var);
  font-size: 0.8rem;

  &:before {
    content: "#";
  }
`;
