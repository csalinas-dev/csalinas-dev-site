import styled from "@emotion/styled";
import { keyboardLetters } from "./defaults";

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
  opacity: .78;
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
    opacity: 1;
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

const letterToKeycap = ({ key, label: l, status: className }) => {
  const props = {
    key,
    className,
  };
  let label = l;
  if (l.length > 1) {
    props.className = `${className} action`;

    switch (label) {
      case "DELETE":
        label = <i>&lt;</i>
        break;
      default:
        break;
    }
  }
  return <Key {...props}>{label}</Key>;
};

export const Keyboard = () => {
  const top = keyboardLetters[0];
  const mid = keyboardLetters[1];
  const bot = keyboardLetters[2];

  return (
    <Board>
      <Row>{top.map(letterToKeycap)}</Row>
      <Row>{mid.map(letterToKeycap)}</Row>
      <Row>{bot.map(letterToKeycap)}</Row>
    </Board>
  );
};
