import { useContext, useEffect, useRef } from "react";
import { Context, dragging, swapTiles } from "./context";

const { default: styled } = require("@emotion/styled");

const Container = styled.div`
  align-items: center;
  aspect-ratio: 1 / 1;
  background-color: var(--selectionBackground);
  border-radius: 10%;
  box-shadow: 0.025rem 0.05rem 0.2rem rgba(0, 0, 0, 0.5);
  cursor: move;
  display: flex;
  justify-content: center;
  overflow: hidden;
  text-shadow: 1px 1px var(--background);
  user-select: none;

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
  const { dispatch } = useContext(Context);
  const ref = useRef(null);

  useEffect(() => {
    const tileRef = ref.current;
    if (tileRef) {
      const dragStart = () => dispatch(dragging(index));
      const prevDef = (e) => e.preventDefault();
      const drop = () => dispatch(swapTiles(index));
      tileRef.addEventListener("dragstart", dragStart);
      tileRef.addEventListener("dragover", prevDef);
      tileRef.addEventListener("drop", drop);

      return () => {
        tileRef.removeEventListener("dragstart", dragStart);
        tileRef.removeEventListener("dragover", prevDef);
        tileRef.removeEventListener("drop", drop);
      };
    }
  }, [ref, dispatch, index]);

  const props = {
    ref,
    className,
    draggable: true,
  };

  return <Container {...props}>{letter}</Container>;
};
