"use client";

import styled from "@emotion/styled";

import "./polyfills/draggable";

import Alerts from "./Alerts";
import { Gameboard } from "./Gameboard";
import { Toolbar } from "./Toolbar";

const Container = styled.div`
  align-items: center;
  display: flex;
  flex-flow: row nowrap;
  height: calc(100vh - 41px);
  justify-content: center;
  padding: 4rem 2rem 2rem;
  position: relative;
  width: 100vw;
`;

export default function Game() {
  return (
    <Container>
      <Alerts />
      <Toolbar />
      <Gameboard />
    </Container>
  );
}
