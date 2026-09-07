"use client";

import Image from "next/image";
import Link from "next/link";
import styled from "@emotion/styled";

import { Module, Section, Title } from "@/components";

import miniMotorways from "@/assets/mini-motorways.jpg";

/* Driven by an array rather than the hand-authored `grid-template-areas` of
   /games: there is one entry today and each new game is one more entry plus one
   nav link. */
const ENTRIES = [
  {
    key: "mini-motorways",
    href: "/gaming/mini-motorways",
    eyebrow: "Stats",
    title: "Mini Motorways",
    image: miniMotorways,
    alt: "Mini Motorways screenshot",
  },
];

/* `auto-fill`, not `auto-fit` — with one entry the card must sit in one 18rem
   track instead of stretching across the viewport. */
const Container = styled.div`
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 18rem), 1fr));

  @media (min-width: 896px) {
    gap: 3rem;
  }
`;

/* 3 / 2 because the source screenshot is 16:9 and `object-position: top` crops
   the bottom; the /games grid's 1 / 2 portrait would throw most of the frame
   away. */
const Card = styled(Link)`
  aspect-ratio: 3 / 2;
  border-radius: 1rem;
  box-shadow: 0 8px 10px 1px rgba(0, 0, 0, 0.14),
    0 3px 14px 2px rgba(0, 0, 0, 0.12), 0 5px 5px -3px rgba(0, 0, 0, 0.2);
  justify-self: center;
  max-width: 24rem;
  overflow: hidden;
  position: relative;
  width: 100%;

  &:hover img {
    transform: scale(1.05);
  }
`;

const CardImage = styled(Image)`
  object-fit: cover;
  object-position: top;
  transform: scale(1);
  transition: transform ease-in-out 250ms;
`;

const CardTitle = styled.div`
  align-items: flex-end;
  background: linear-gradient(to top, #181818, transparent);
  bottom: 0;
  color: var(--function);
  display: flex;
  font-size: 1.5rem;
  justify-content: flex-start;
  left: 0;
  padding: 2rem 1rem;
  position: absolute;
  right: 0;
  top: 0;
  user-select: none;

  @media (min-width: 500px) {
    font-size: 2rem;
  }
`;

export const Gaming = () => (
  <Section>
    <Title>Gaming</Title>
    <Container>
      {ENTRIES.map(({ key, href, eyebrow, title, image, alt }) => (
        <Card key={key} href={href}>
          {/* `sizes` is not optional here: the source is 2560x1440 / 509 KB, and
              without it Next serves the image at viewport width into a tile that
              is never wider than 18rem. */}
          <CardImage
            alt={alt}
            fill
            placeholder="blur"
            sizes="(min-width: 896px) 18rem, 100vw"
            src={image}
          />
          <CardTitle>
            <div>
              <Module>{eyebrow}</Module>
              <br />
              {title}
            </div>
          </CardTitle>
        </Card>
      ))}
    </Container>
  </Section>
);
