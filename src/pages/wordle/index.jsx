import styled from "@emotion/styled";

import { ContextProvider } from "./context";

import Gameboard from "./Gameboard";
import Keyboard from "./Keyboard";

const Container = styled.div`
  align-content: stretch;
  display: grid;
  gap: 0.5rem;
  grid-template-areas:
    "title title title title title"
    "tile tile tile tile tile"
    "tile tile tile tile tile"
    "tile tile tile tile tile"
    "tile tile tile tile tile"
    "tile tile tile tile tile"
    "tile tile tile tile tile"
    "keyboard keyboard keyboard keyboard keyboard";
  grid-template-columns: repeat(5, 1fr);
  grid-template-rows: auto repeat(6, min-content) auto;
  height: 100vh;
  justify-content: center;
  justify-items: center;
  max-width: 100%;
  position: relative;

  @media (min-aspect-ratio: 2/3) {
    grid-template-columns: repeat(5, auto);
    grid-template-rows: min-content repeat(6, 1fr) min-content;
  }
`;

const Title = styled.h1`
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

export const Wordle = () => (
  <ContextProvider>
    <Container>
      <Title>Wordle</Title>
      <Gameboard />
      <Keyboard />
    </Container>
  </ContextProvider>
);
