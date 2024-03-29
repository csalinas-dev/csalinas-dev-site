import { useEffect } from "react";
import styled from "@emotion/styled";

import "./polyfills/draggable";

import { ContextProvider } from "./context";
import Alerts from "./Alerts";
import { Gameboard } from "./Gameboard";
import { Toolbar } from "./Toolbar";

const Container = styled.div`
  align-items: center;
  display: flex;
  flex-flow: row nowrap;
  height: 100vh;
  justify-content: center;
  padding: 4rem 2rem 2rem;
  position: relative;
  width: 100vw;
`;

export const Hashtag = () => {
  useEffect(() => {
    document.title = "Hashtag | Christopher Salinas Jr.";
  });

  return (
    <ContextProvider>
      <Container>
        <Alerts />
        <Toolbar />
        <Gameboard />
      </Container>
    </ContextProvider>
  );
};

export * from "./instructions";
