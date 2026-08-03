"use client";

import Image from "next/image";
import Link from "next/link";
import styled from "@emotion/styled";

import { Module, Section, Title } from "@/components";

import wordleverse from "@/assets/wordleverse.jpg";
import hashtag from "@/assets/hashtag.jpg";
import miniMotorways from "@/assets/mini-motorways.jpg";

const Container = styled.div`
  display: grid;
  gap: 1rem;
  grid-template-areas:
    "wordle hashtag"
    "tictactoe tictactoe"
    "motorways motorways";
  grid-template-columns: 1fr 1fr;
  grid-template-rows: auto;

  .wordle {
    aspect-ratio: 1 / 2;
    grid-area: wordle;
  }

  .hashtag {
    aspect-ratio: 1 / 2;
    grid-area: hashtag;
  }

  .tictactoe {
    aspect-ratio: 2 / 1;
    grid-area: tictactoe;
  }

  .motorways {
    aspect-ratio: 2 / 1;
    grid-area: motorways;
  }

  @media (min-width: 896px) {
    gap: 3rem;
  }

  @media (min-width: 1296px) {
    grid-template-areas: "wordle hashtag tictactoe motorways";
    grid-template-columns: 1fr 1fr 1fr 2fr;

    .tictactoe {
      aspect-ratio: 1 / 2;
    }
  }
`;

const Card = styled(Link)`
  border-radius: 1rem;
  box-shadow: 0 8px 10px 1px rgba(0, 0, 0, 0.14),
    0 3px 14px 2px rgba(0, 0, 0, 0.12), 0 5px 5px -3px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  position: relative;
  width: 100%;

  &:hover img,
  &:hover .artwork {
    transform: scale(1.05);
  }
`;

const CardImage = styled(Image)`
  object-fit: cover;
  transform: scale(1);
  transition: transform ease-in-out 250ms;
  object-position: top;
`;

// Stand-in artwork for games with no screenshot yet — a stylised board drawn
// in the site palette so the card still reads as a game tile.
const CardArtwork = styled.div`
  /* Sits high and to the right so the card title keeps the bottom-left
     corner to itself, whichever way round the card is. */
  align-items: flex-start;
  background: radial-gradient(circle at 60% 25%, #2b2b2b, #151515 75%);
  display: flex;
  height: 100%;
  justify-content: flex-end;
  padding: 8%;
  transform: scale(1);
  transition: transform ease-in-out 250ms;
  width: 100%;

  /* The card is wide here and tall past 1296px, so the square board is sized
     off whichever edge is the short one. */
  svg {
    aspect-ratio: 1 / 1;
    height: 100%;
    width: auto;

    @media (min-width: 1296px) {
      height: auto;
      width: 100%;
    }
  }
`;

const CardTitle = styled.div`
  align-items: flex-end;
  background: linear-gradient(to top, #181818, transparent);
  bottom: 0;
  color: var(--function);
  display: flex;
  font-size: 1rem;
  justify-content: flex-start;
  left: 0;
  padding: 2rem 1rem;
  position: absolute;
  right: 0;
  top: 0;
  user-select: none;

  @media (min-width: 500px) {
    font-size: 1.5rem;
  }

  @media (min-width: 696px) {
    font-size: 2rem;
  }

  @media (min-width: 896px) {
    font-size: 2.75rem;
  }

  @media (min-width: 1296px) {
    font-size: 2rem;
  }

  @media (min-width: 1596px) {
    font-size: 2.75rem;
  }
`;

// Cell origins for a 3x3 board of 90px cells separated by 15px gutters.
const OFFSETS = [0, 105, 210];
const cell = (index) => ({
  x: OFFSETS[index % 3],
  y: OFFSETS[Math.floor(index / 3)],
});

const TicTacToeArtwork = () => (
  <svg viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg">
    {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((index) => {
      const { x, y } = cell(index);
      return (
        <rect
          fill="rgba(173, 214, 255, 0.15)"
          height="90"
          key={index}
          rx="9"
          width="90"
          x={x}
          y={y}
        />
      );
    })}
    <g fill="none" strokeLinecap="round" strokeWidth="11">
      {/* X's oldest mark, on its way out. */}
      <g opacity="0.35" stroke="#4fc1ff">
        <line x1="20" y1="20" x2="70" y2="70" />
        <line x1="70" y1="20" x2="20" y2="70" />
      </g>
      <g stroke="#4fc1ff">
        <line x1="230" y1="20" x2="280" y2="70" />
        <line x1="280" y1="20" x2="230" y2="70" />
        <line x1="125" y1="125" x2="175" y2="175" />
        <line x1="175" y1="125" x2="125" y2="175" />
      </g>
      <g stroke="#ce9178">
        <circle cx="150" cy="45" r="26" />
        <circle cx="255" cy="150" r="26" />
        <circle cx="45" cy="255" r="26" />
      </g>
    </g>
    <rect
      fill="none"
      height="90"
      rx="9"
      stroke="rgba(204, 204, 204, 0.54)"
      strokeDasharray="10 8"
      strokeWidth="3"
      width="90"
      x="0"
      y="0"
    />
  </svg>
);

export default function Page() {
  return (
    <Section>
      <Title>Games</Title>
      <Container>
        <Card className="wordle" href="/games/wordleverse">
          <CardImage
            alt="Wordleverse Screenshot"
            fill
            placeholder="blur"
            src={wordleverse}
          />
          <CardTitle>
            <div>
              <Module>Play</Module>
              <br />
              Wordleverse
            </div>
          </CardTitle>
        </Card>
        <Card className="hashtag" href="/games/hashtag">
          <CardImage
            alt="Hashtag Screenshot"
            fill
            placeholder="blur"
            src={hashtag}
          />
          <CardTitle>
            <div>
              <Module>Play</Module>
              <br />
              Hashtag
            </div>
          </CardTitle>
        </Card>
        <Card className="tictactoe" href="/games/infinite-tic-tac-toe">
          <CardArtwork aria-hidden="true" className="artwork">
            <TicTacToeArtwork />
          </CardArtwork>
          <CardTitle>
            <div>
              <Module>Play</Module>
              <br />
              Infinite Tic-Tac-Toe
            </div>
          </CardTitle>
        </Card>
        <Card className="motorways" href="/games/mini-motorways">
          <CardImage
            alt="Mini Motorways Screenshot"
            fill
            placeholder="blur"
            src={miniMotorways}
          />
          <CardTitle>
            <div>
              <Module>Compare</Module>
              <br />
              Mini Motorways
            </div>
          </CardTitle>
        </Card>
      </Container>
    </Section>
  );
}
