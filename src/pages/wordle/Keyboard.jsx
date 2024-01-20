import { useContext } from "react";
import { slice, sortBy } from "lodash";
import styled from "@emotion/styled";

import { Context, addLetter, removeLetter, submitGuess } from "./context";

const Board = styled.div`
  align-self: end;
  display: flex;
  flex-flow: column nowrap;
  gap: 0.5rem;
  grid-area: keyboard;
  max-width: 100%;
  padding: 1rem;
  width: auto;
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
`;

const Key = styled.span`
  align-items: center;
  aspect-ratio: 3 / 4;
  background-color: var(--selectionBackground);
  border-radius: 10%;
  box-shadow: 0.025rem 0.05rem 0.2rem rgba(0, 0, 0, 0.5);
  cursor: pointer;
  display: flex;
  justify-content: center;
  max-width: 50px;
  opacity: 1;
  overflow: hidden;
  text-shadow: 1px 1px var(--background);
  transition: opacity ease-in-out 100ms;
  user-select: none;
  width: 9vw;

  font-size: 1rem;
  line-height: 1rem;
  min-height: 1rem;

  @media (min-width: 360px) {
    font-size: 1.5rem;
    line-height: 1.5rem;
    min-height: 1.5rem;
  }

  @media (min-width: 600px) {
    font-size: 2rem;
    line-height: 2rem;
    min-height: 2rem;
  }

  &:hover {
    opacity: 0.78;
  }

  &.disabled {
    pointer-events: none;
  }

  &.action {
    aspect-ratio: 3 / 2 !important;
    font-size: 1rem;
    height: 100%;
    line-height: 1rem;
    max-width: initial !important;
    width: initial !important;
  }

  &.absent {
    background-color: var(--absentBackground);
    color: rgba(204, 204, 204, 0.54);
    pointer-events: none;
  }

  &.present {
    background-color: var(--selector);
    color: var(--background);
  }

  &.correct {
    background-color: var(--comment);
  }
`;

const Keyboard = () => {
  const {
    state: { keyboard, win },
    dispatch,
  } = useContext(Context);

  const letterToKeycap = ({ key, label: l, status: className }) => {
    const props = {
      key,
      className,
    };

    if (win) {
      props.className += ` disabled`;
    }

    if (l.length > 1) {
      props.className += ` action`;
    }

    let label = l;
    switch (label) {
      case "DELETE":
        label = <i>&lt;</i>;
        props.onClick = () => dispatch(removeLetter());
        break;
      case "ENTER":
        props.onClick = () => dispatch(submitGuess());
        break;
      default:
        props.onClick = () => dispatch(addLetter(l));
        break;
    }

    return <Key {...props}>{label}</Key>;
  };

  const sorted = sortBy(keyboard, "key");
  const top = slice(sorted, 0, 10);
  const mid = slice(sorted, 10, 19);
  const bot = slice(sorted, 19);

  return (
    <Board>
      <Row>{top.map(letterToKeycap)}</Row>
      <Row>{mid.map(letterToKeycap)}</Row>
      <Row>{bot.map(letterToKeycap)}</Row>
    </Board>
  );
};

export default Keyboard;
