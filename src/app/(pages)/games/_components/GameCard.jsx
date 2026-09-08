"use client";

import Link from "next/link";
import styled from "@emotion/styled";

import { Module } from "@/components";

// auto-fit collapses the repeated tracks nobody filled, so the row is as wide
// as there are games: two on a phone, one row of five on a desktop. No game is
// named anywhere in here, which is the point — a sixth tile needs no CSS.
// The horizontal padding is the page's only gutter now that the grid is
// full-bleed, and it is deliberately equal to the gap so the rhythm is uniform
// edge to edge. Change one and change the other.
export const GameGrid = styled.div`
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(min(9rem, 100%), 1fr));
  padding: 0 1rem;

  @media (min-width: 896px) {
    gap: 2rem;
    padding: 0 2rem;
  }
`;

const Card = styled(Link)`
  /* The card owns the shape, not the artwork: every tile is the same portrait
     at every width. The ratio is also what gives the card a height, since
     container-type contains its contents' contribution to it. */
  aspect-ratio: 1 / 2;
  border-radius: 1rem;
  box-shadow: 0 8px 10px 1px rgba(0, 0, 0, 0.14),
    0 3px 14px 2px rgba(0, 0, 0, 0.12), 0 5px 5px -3px rgba(0, 0, 0, 0.2);
  container-type: inline-size;
  overflow: hidden;
  position: relative;
  width: 100%;

  &:hover .media {
    transform: scale(1.05);
  }
`;

const Media = styled.div`
  /* Sits high and to the right so the card title keeps the bottom-left
     corner to itself. */
  align-items: flex-start;
  background: radial-gradient(circle at 60% 25%, #2b2b2b, #151515 75%);
  bottom: 0;
  display: flex;
  justify-content: flex-end;
  left: 0;
  padding: 8%;
  position: absolute;
  right: 0;
  top: 0;
  transform: scale(1);
  transition: transform ease-in-out 250ms;

  /* Artwork is authored square; the card is always the taller edge, so the
     board is sized off the width. */
  svg {
    aspect-ratio: 1 / 1;
    height: auto;
    width: 100%;
  }
`;

// Sized in container units so the title tracks the card it sits on. Viewport
// media queries would be wrong here: with a fluid column count a wider window
// can mean a narrower card.
const CardTitle = styled.div`
  align-items: flex-end;
  background: linear-gradient(to top, #181818, transparent);
  bottom: 0;
  color: var(--function);
  display: flex;
  font-size: clamp(0.875rem, 13cqw, 2.75rem);
  justify-content: flex-start;
  left: 0;
  padding: 10cqw 7cqw;
  position: absolute;
  right: 0;
  top: 0;
  user-select: none;
`;

export const GameCard = ({ href, title, children }) => (
  <Card href={href}>
    <Media aria-hidden="true" className="media">
      {children}
    </Media>
    <CardTitle>
      <div>
        <Module>Play</Module>
        <br />
        {title}
      </div>
    </CardTitle>
  </Card>
);
