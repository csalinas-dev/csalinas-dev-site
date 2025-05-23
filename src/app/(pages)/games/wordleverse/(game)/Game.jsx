"use client";

import { useSearchParams } from "next/navigation";
import styled from "@emotion/styled";

import { useResponsiveBoards } from "./_hooks";
import { ContextProvider } from "./_context";

import Alerts from "./Alerts";
import Header from "./Header";
import Gameboard from "./Gameboard";
import Keyboard from "./Keyboard";

const Grid = styled.div`
  align-items: center;
  display: grid;
  grid-template-areas:
    "header"
    "boards";
  grid-template-columns: 100%;
  grid-template-rows: max-content 1fr;
  height: calc(100vh - 41px);
  justify-content: center;
  padding: 1rem;
  position: relative;
  width: 100vw;
`;

const Container = styled.div`
  align-items: center;
  grid-area: boards;
  height: 100%;
  position: relative;
  width: 100%;
`;

const Boards = styled.div`
  align-items: center;
  bottom: 0;
  display: flex;
  flex-flow: column nowrap;
  gap: 0.5rem;
  justify-content: flex-start;
  left: 0;
  position: absolute;
  right: 0;
  top: 0;
`;

export default function Game() {
  const searchParams = useSearchParams();
  const date = searchParams.get("date");

  const { container, width, height } = useResponsiveBoards();
  const actualHeight = height - 16;
  const isPortrait = width / actualHeight < 0.6298020955;
  let w, hGB, hKB;
  if (isPortrait) {
    w = width;
  } else {
    const unit = actualHeight / 571;
    hGB = unit * 438;
    hKB = unit * 133;
  }

  return (
    <ContextProvider date={date}>
      <Grid>
        <Alerts />
        <Header date={date} />
        <Container ref={container}>
          <Boards>
            <Gameboard width={w} height={hGB} />
            <Keyboard width={w} height={hKB} />
          </Boards>
        </Container>
      </Grid>
    </ContextProvider>
  );
}
