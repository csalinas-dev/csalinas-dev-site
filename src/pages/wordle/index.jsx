import styled from "@emotion/styled";
import { ContextProvider } from "./context";

import Header from "./Header";
import Gameboard from "./Gameboard";
import Keyboard from "./Keyboard";
import Alerts from "./Alerts";

const Container = styled.div`
  align-content: stretch;
  display: grid;
  gap: 0.5rem;
  grid-template-areas:
    "header header header header header"
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

export const Wordle = () => (
  <ContextProvider>
    <Container>
      <Alerts />
      <Header />
      <Gameboard />
      <Keyboard />
    </Container>
  </ContextProvider>
);
