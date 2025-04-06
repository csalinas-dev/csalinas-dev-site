import { useContext, useEffect } from "react";
import styled from "@emotion/styled";

import {
  Const,
  FormattedDate,
  Function,
  Module,
  Link,
  Numeric,
  Parenthesis,
  Var,
} from "@/components";
import words from "@/data/words.json";

import { Context, toggleExpert } from "./_context";
import { Box } from "@mui/material";

const Container = styled.header`
  align-items: center;
  display: flex;
  flex-flow: column nowrap;
  gap: 0.25rem;
  grid-area: header;
  justify-content: center;
  padding-bottom: 1rem;
  padding-top: 2rem;
  position: relative;
`;

const Toolbar = styled.div`
  background-color: var(--absentBackground);
  display: flex;
  flex-flow: row nowrap;
  font-size: 1rem;
  justify-content: end;
  left: -1rem;
  line-height: 1rem;
  padding: 0.5rem 1rem;
  position: absolute;
  right: -1rem;
  top: -1rem;

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

const NavLinks = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;

  a,
  button {
    display: flex;
    align-items: center;
    gap: 0.25rem;

    &:hover {
      color: #ffffff;
    }
  }

  @media (max-width: 768px) {
    gap: 0.5rem;
    font-size: 0.8rem;
  }
`;

const Toggle = styled.span`
  cursor: pointer;
  user-select: none;
`;

const Header = ({ date }) => {
  const {
    state: { expert, row, title, wordsRemaining },
    dispatch,
  } = useContext(Context);

  const titleContent = title ? (
    <Module>{title}</Module>
  ) : (
    <FormattedDate date={date ? new Date(date + "T00:00:00") : new Date()} />
  );

  useEffect(() => {
    if (wordsRemaining.length > 0) {
      var event = new Event("dispatch");
      window.dispatchEvent(event);
    }
  }, [wordsRemaining]);

  const expertString = expert ? "true" : "false";
  return (
    <Container>
      <Toolbar>
        <Box sx={{ display: { xs: "none !important", md: "flex !important" } }}>
          Wordleverse
        </Box>
        <Box
          sx={{
            justifyContent: {
              xs: "flex-start !important",
              md: "center !important",
            },
          }}
        >
          {titleContent}
        </Box>
        <div>
          <NavLinks>
            <Link href="/games/wordleverse/history">
              <i className="fa-solid fa-clock-rotate-left" /> History
            </Link>
            <Link href="/games/wordleverse/instructions">
              <i className="fa-regular fa-circle-question" /> How to Play
            </Link>
          </NavLinks>
        </div>
      </Toolbar>
      {row === 0 && (
        <Toggle onClick={() => dispatch(toggleExpert())}>
          <Function>expertMode</Function>
          <Parenthesis>{"("}</Parenthesis>
          <span>{expertString}</span>
          <Parenthesis>{")"}</Parenthesis>
        </Toggle>
      )}
      {row > 0 && (
        <span>
          <Const>const</Const> <Var>expertMode</Var> <span>=</span>{" "}
          <Numeric>{expertString}</Numeric>
          <span>;</span>
        </span>
      )}
      <span>
        <Const>let</Const> <Var>wordsRemaining</Var> <span>=</span>{" "}
        <Numeric>
          {wordsRemaining.length > 0 ? wordsRemaining.length : words.length}
        </Numeric>
        <span>;</span>
      </span>
    </Container>
  );
};

export default Header;
