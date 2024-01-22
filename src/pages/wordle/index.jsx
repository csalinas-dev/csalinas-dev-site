import styled from "@emotion/styled";
import { ContextProvider } from "./context";

import Alerts from "./Alerts";
import Header from "./Header";
import Gameboard from "./Gameboard";
import Keyboard from "./Keyboard";

const Container = styled.div`
  display: grid;
  gap: 1rem;
  grid-template-areas:
    "header"
    "gameboard"
    "metadata"
    "keyboard";
  grid-template-columns: max-content;
  grid-template-rows: max-content 1fr max-content max-content;
  height: 100vh;
  justify-content: center;
  overflow: hidden;
  padding: 1rem;
  position: relative;
  width: 100vw;
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
