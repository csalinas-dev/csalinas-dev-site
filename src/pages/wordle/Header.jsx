import styled from "@emotion/styled";
import { useContext, useEffect } from "react";

import {
  Const,
  FormattedDate,
  Function,
  Module,
  Numeric,
  Parenthesis,
  Title,
  Var,
} from "../../components";
import { Context, toggleExpert } from "./context";
import words from "./context/words.json";

const Container = styled.header`
  align-items: center;
  display: flex;
  flex-flow: column nowrap;
  gap: 0.25rem;
  grid-area: header;
  justify-content: center;
  padding-bottom: 1rem;
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

  const titleContent = title ? (
    <Module>{title}</Module>
  ) : (
    <FormattedDate date={new Date()} />
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
