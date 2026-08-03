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

/**
 * The board, identical in both modes. `banner` is the one seam: hotseat renders
 * nothing there, online slots in who you are and which room you are in. It is
 * rendered here rather than wrapped around <Game/> because the toolbar is
 * absolutely positioned against this container.
 */
export default function Game({ banner = null }) {
  return (
    <Container>
      <Toolbar />
      {banner}
      <Gameboard />
      <Status />
      <PlayAgain />
    </Container>
  );
}
