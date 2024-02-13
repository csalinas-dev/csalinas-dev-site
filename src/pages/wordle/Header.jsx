import styled from "@emotion/styled";
import dateFormat from "dateformat";

import {
  Comment,
  Const,
  Function,
  Numeric,
  Parenthesis,
  Var,
} from "../../components";
import { useContext, useEffect } from "react";
import { Context, toggleExpert } from "./context";

const Container = styled.header`
  align-items: center;
  display: flex;
  flex-flow: column nowrap;
  gap: 0.25rem;
  grid-area: header;
  justify-content: center;
  padding-bottom: 1rem;
`;

const Title = styled.h1`
  align-self: center;
  font-size: 2rem;
  line-height: 2rem;
  justify-self: center;
  user-select: none;
  margin-top: 0;
  margin-bottom: 0.75rem;

  @media (min-width: 360px) {
    font-size: 3rem;
    line-height: 3rem;
  }

  @media (min-width: 768px) {
    font-size: 5rem;
    line-height: 5rem;
  }
`;

const Toggle = styled.span`
  cursor: pointer;
  user-select: none;
`;

const Header = () => {
  const {
    state: { expert, row, title, wordsRemaining },
    dispatch,
  } = useContext(Context);

  let titleContent;
  if (title) {
    titleContent = <Numeric>{title}</Numeric>;
  } else {
    const now = new Date();
    const month = dateFormat(now, "mmmm");
    const day = dateFormat(now, "d");
    const suffix = dateFormat(now, "S");
    const year = dateFormat(now, "yyyy");
    titleContent = (
      <Comment>
        {"// "}
        {month} {day}
        <sup>{suffix}</sup>, {year}
      </Comment>
    );
  }

  useEffect(() => {
    if (wordsRemaining.length > 0) {
      var event = new Event("dispatch");
      window.dispatchEvent(event);
    }
  }, [wordsRemaining]);

  const expertString = expert ? "true" : "false";
  return (
    <Container>
      <Title>Wordleverse</Title>
      {titleContent}
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
      {wordsRemaining.length > 0 && (
        <span>
          <Const>let</Const> <Var>wordsRemaining</Var> <span>=</span>{" "}
          <Numeric>{wordsRemaining.length}</Numeric>
          <span>;</span>
        </span>
      )}
    </Container>
  );
};

export default Header;
