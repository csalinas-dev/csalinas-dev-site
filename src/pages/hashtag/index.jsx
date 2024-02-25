import { useEffect } from "react";
import styled from "@emotion/styled";
import { Link } from "react-router-dom";

import { ContextProvider } from "./context";
import { Gameboard } from "./Gameboard";

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

const Toolbar = styled.div`
  background-color: var(--absentBackground);
  display: flex;
  flex-flow: row nowrap;
  font-size: 1rem;
  justify-content: end;
  left: 0;
  line-height: 1rem;
  padding: 0.5rem 1rem;
  position: absolute;
  right: 0;
  top: 0;
`;

export const Hashtag = () => {
  useEffect(() => {
    document.title = "Hashtag | Christopher Salinas Jr.";
  });

  return (
    <ContextProvider>
      <Container>
        <Toolbar>
          <Link to="instructions">
            <i className="fa-regular fa-circle-question" /> How to Play
          </Link>
        </Toolbar>
        <Gameboard />
      </Container>
    </ContextProvider>
  );
};

export * from "./instructions";
