import { useCallback, useContext } from "react";
import { Context, dragging, swapTiles } from "./context";

const { default: styled } = require("@emotion/styled");

const Container = styled.div`
  align-items: center;
  aspect-ratio: 1 / 1;
  background-color: var(--selectionBackground);
  border-radius: 10%;
  box-shadow: 0.025rem 0.05rem 0.2rem rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  overflow: hidden;
  text-shadow: 1px 1px var(--background);
  user-select: none;

  &.draggable {
    cursor: grab;
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

export const Tile = ({ tile, index }) => {
  const { letter, status: className } = tile;
  const {
    state: { win },
    dispatch,
  } = useContext(Context);

  const props = { className };

  const onDragStart = useCallback(
    () => dispatch(dragging(index)),
    [dispatch, index]
  );
  const onDragOver = useCallback((e) => e.preventDefault(), []);
  const onDrop = useCallback(
    () => dispatch(swapTiles(index)),
    [dispatch, index]
  );

  if (win === null) {
    props.className += " draggable";
    props.draggable = true;
    props.onDragStart = onDragStart;
    props.onDragOver = onDragOver;
    props.onDrop = onDrop;
  }

  return <Container {...props}>{letter}</Container>;
};
