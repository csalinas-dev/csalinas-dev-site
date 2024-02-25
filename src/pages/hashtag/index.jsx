import { useEffect } from "react";
import styled from "@emotion/styled";

import { ContextProvider } from "./context";
import { Gameboard } from "./Gameboard";

const Container = styled.div`
  align-items: center;
  display: flex;
  flex-flow: row nowrap;
  height: 100vh;
  justify-content: center;
  padding: 2rem;
  width: 100vw;
`;

export const Hashtag = () => {
  useEffect(() => {
    document.title = "Wordleverse | Christopher Salinas Jr.";
  });

  return (
    <ContextProvider>
      <Container>
        <Gameboard />
      </Container>
    </ContextProvider>
  );
};
