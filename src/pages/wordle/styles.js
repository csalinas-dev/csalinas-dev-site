import { range } from "lodash";
import styled from "@emotion/styled";
import { css } from "@emotion/react";

const tileGrid = range(5)
  .map((_) => "tile")
  .join(" ");

export const section = css`
  overflow: none;
  height: 100vh;
`;

export const Title = styled.h1`
  font-size: 5rem;
  grid-area: title;
`;

export const Board = styled.div`
  display: grid;
  gap: 0.5rem;
  grid-template-columns: repeat(5, 1fr);
  grid-template-rows: min-content auto auto auto auto auto auto min-content;
  grid-template-areas:
    "title title title title title"
    "${tileGrid}"
    "${tileGrid}"
    "${tileGrid}"
    "${tileGrid}"
    "${tileGrid}"
    "${tileGrid}"
    "keyboard keyboard keyboard keyboard keyboard";
`;

export const Tile = styled.div`
  aspect-ratio: 1 / 1;
  border-radius: 10%;
  height: 100%;
  background-color: var(--selectionBackground);

  &.contains {
    background-color: var(--parenthesis);
  }

  &.contains {
    background-color: var(--comment);
  }
`;
