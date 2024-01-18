import { range } from "lodash";
import styled from "@emotion/styled";

const tileGrid = range(5)
  .map((_) => "tile")
  .join(" ");

export const Title = styled.h1`
  align-self: center;
  font-size: 3rem;
  line-height: 3rem;
  grid-area: title;
  justify-self: center;
  margin: 2rem 0;
  user-select: none;

  @media (min-width: 360px) {
    font-size: 5rem;
    line-height: 5rem;
  }
`;

export const Wordle = styled.div`
  align-content: stretch;
  display: grid;
  gap: 0.5rem;
  grid-template-areas:
    "title title title title title"
    "${tileGrid}"
    "${tileGrid}"
    "${tileGrid}"
    "${tileGrid}"
    "${tileGrid}"
    "${tileGrid}"
    "keyboard keyboard keyboard keyboard keyboard";
  grid-template-columns: repeat(5, 1fr);
  grid-template-rows: auto repeat(6, min-content) auto;
  height: 100vh;
  justify-content: center;
  justify-items: center;
  max-width: 100%;

  @media (min-aspect-ratio: 2/3) {
    grid-template-columns: repeat(5, auto);
    grid-template-rows: min-content repeat(6, 1fr) min-content;
  }
`;

export const Tile = styled.div`
  align-items: center;
  aspect-ratio: 1 / 1;
  background-color: var(--selectionBackground);
  border-radius: 10%;
  box-shadow: .025rem .05rem .2rem rgba(0,0,0,0.5);
  display: flex;
  justify-content: center;
  min-height: 50px;
  min-width: 50px;
  text-shadow: 1px 1px var(--background);
  user-select: none;

  @media (min-aspect-ratio: 2/3) {
    aspect-ratio: initial;
    height: 100%;
  }

  &.present {
    background-color: var(--selector);
    color: var(--background);
  }

  &.correct {
    background-color: var(--comment);
  }
`;
