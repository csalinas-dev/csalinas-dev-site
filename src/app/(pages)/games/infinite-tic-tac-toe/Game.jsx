"use client";

import styled from "@emotion/styled";

import { Gameboard } from "./Gameboard";
import { Toolbar } from "./Toolbar";
import { PlayAgain, Status } from "./components";

const Container = styled.div`
  align-items: center;
  display: flex;
  flex: 1 1 auto;
  flex-flow: column nowrap;
  gap: 1.25rem;
  justify-content: center;
  padding: 3.5rem 1.5rem 1.5rem;
  position: relative;
  width: 100%;
`;

export default function Game() {
  return (
    <Container>
      <Toolbar />
      <Gameboard />
      <Status />
      <PlayAgain />
    </Container>
  );
}
