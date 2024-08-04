"use client";

import Image from "next/image";
import Link from "next/link";
import styled from "@emotion/styled";

import { Function, Module, Section, Title } from "@/components";

import wordleverse from "@/assets/wordleverse.jpg";
import hashtag from "@/assets/hashtag.jpg";
import miniMotorways from "@/assets/mini-motorways.jpg";

const Container = styled.div`
  display: grid;
  gap: 1rem;
  grid-template-areas:
    "wordle hashtag"
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

  .motorways {
    aspect-ratio: 2 / 1;
    grid-area: motorways;
  }

  @media (min-width: 896px) {
    gap: 3rem;
  }

  @media (min-width: 1296px) {
    grid-template-areas: "wordle hashtag motorways";
    grid-template-columns: 1fr 1fr 2fr;
  }
`;

const Card = styled(Link)`
  border-radius: 1rem;
  box-shadow: 0 8px 10px 1px rgba(0, 0, 0, 0.14),
    0 3px 14px 2px rgba(0, 0, 0, 0.12), 0 5px 5px -3px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  position: relative;
  width: 100%;

  &:hover img {
    transform: scale(1.05);
  }
`;

const CardImage = styled(Image)`
  object-fit: cover;
  transform: scale(1);
  transition: transform ease-in-out 250ms;
  object-position: top;
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
