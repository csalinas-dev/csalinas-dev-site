"use client";

import { useContext } from "react";
import styled from "@emotion/styled";

import { Link } from "@/components";

import { Context } from "./context";

const Container = styled.div`
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

  > div {
    align-items: center;
    display: flex;
    flex-flow: row nowrap;
    flex: 1 1 0;
    justify-content: center;
    padding: 0 0.5rem;
    white-space: nowrap;

    @media (max-width: 600px) {
      font-size: 0.8rem;
      padding: 0 0.25rem;
    }

    &:first-of-type {
      justify-content: start;
    }

    &:last-of-type {
      justify-content: end;
    }
  }
`;

export const Toolbar = () => {
  const {
    state: { moves },
  } = useContext(Context);

  return (
    <Container>
      <div>Hashtag</div>
      <div>{moves} moves left</div>
      <div>
        <Link href="/games/hashtag/instructions">
          <i className="fa-regular fa-circle-question" /> How to Play
        </Link>
      </div>
    </Container>
  );
};
