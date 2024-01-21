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
  width: fit-content;
`;

const Row = styled.div`
  display: flex;
  align-items: stretch;
  justify-content: center;
  flex-flow: row nowrap;
  gap: 0.5rem;
`;

const Key = styled.span`
  align-items: center;
  background-color: var(--selectionBackground);
  border-radius: 10%;
  box-shadow: 0.025rem 0.05rem 0.2rem rgba(0, 0, 0, 0.5);
  cursor: pointer;
  display: flex;
  justify-content: center;
  opacity: 1;
  text-shadow: 1px 1px var(--background);
  transition: opacity ease-in-out 100ms;
  user-select: none;

  // Sizing
  aspect-ratio: 3 / 4;
  height: 6vh;

  &.action {
    aspect-ratio: 6 / 5;
  }

  // Fonts
  font-size: 1rem;
  line-height: 1rem;

  @media (min-width: 360px) {
    font-size: 1.5rem;
    line-height: 1.5rem;
  }

  @media (min-width: 600px) {
    font-size: 2rem;
    line-height: 2rem;
  }

  &:hover {
    opacity: 0.78;
  }

  &.disabled {
    pointer-events: none;
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
        label = <i className="fa-solid fa-delete-left" />;
        props.onClick = () => dispatch(removeLetter());
        break;
      case "ENTER":
        label = <i className="fa-solid fa-play" />;
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
