import { useContext, useEffect, useState } from "react";
import { slice, sortBy } from "lodash";
import styled from "@emotion/styled";

import { Context, addLetter, removeLetter, submitGuess } from "./context";

const gap = 0.5;
const g = 16 * gap;

const Board = styled.footer`
  align-self: end;
  display: flex;
  flex-flow: column nowrap;
  gap: ${gap}rem;
  grid-area: keyboard;
  max-width: 100%;
  width: fit-content;
`;

const Row = styled.div`
  display: flex;
  align-items: stretch;
  justify-content: center;
  flex-flow: row nowrap;
  gap: ${gap}rem;
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
  overflow: hidden;

  // Sizing
  aspect-ratio: 3 / 4;

  &.action {
    aspect-ratio: 6 / 5;
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
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const update = () => setWidth(window.innerWidth);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  });

  const letterToKeycap = ({ key, label: l, status: className }) => {
    const getHeight = (w) => ((w - 32 - 9 * g) / 10) * (4 / 3);
    let tileSize = getHeight(280);
    if (width > 600) {
      tileSize = getHeight(600);
    } else if (width > 500) {
      tileSize = getHeight(500);
    } else if (width > 360) {
      tileSize = getHeight(360);
    }
    const font = tileSize * 0.75;
    const props = {
      key,
      className,
      style: {
        fontSize: font,
        lineHeight: font,
        height: tileSize,
      },
    };

    if (win) {
      props.className += ` disabled`;
    }

    if (l.length > 1) {
      props.className += ` action`;
      props.style.fontSize = font * 0.75;
      props.style.lineHeight = font * 0.75;
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
