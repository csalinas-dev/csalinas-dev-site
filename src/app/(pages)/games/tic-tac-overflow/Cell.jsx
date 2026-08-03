import { useCallback, useContext, useMemo } from "react";
import styled from "@emotion/styled";

import { Context, getPreviewedCell, placeMark } from "./context";
import { Glyph } from "./components";

const ROWS = ["top", "middle", "bottom"];
const COLUMNS = ["left", "center", "right"];

const Container = styled.button`
  align-items: center;
  aspect-ratio: 1 / 1;
  background-color: var(--selectionBackground);
  border: none;
  border-radius: 10%;
  box-shadow: 0.025rem 0.05rem 0.2rem rgba(0, 0, 0, 0.5);
  color: inherit;
  cursor: default;
  display: flex;
  justify-content: center;
  padding: 14%;
  transition: background-color ease-in-out 150ms;
  width: 100%;

  &:focus-visible {
    outline: 2px solid var(--var);
    outline-offset: 2px;
  }

  &.open {
    cursor: pointer;

    &:hover {
      background-color: var(--absentBackground);
    }
  }

  /* The mark that the next move clears — faded and outlined so it reads as
     on its way out. */
  &.expiring {
    border: 2px dashed var(--absentForeground);

    svg {
      opacity: 0.35;
    }
  }

  &.winning {
    background-color: var(--comment);
  }
`;

export const Cell = ({ index, onKeyDown, register }) => {
  const { state, dispatch, canPlay } = useContext(Context);
  const { board, turn, winner, winningLine } = state;

  const mark = board[index];
  const expiring = getPreviewedCell(state) === index;
  const winning = winningLine !== null && winningLine.includes(index);
  // `canPlay` is always true hotseat. Online it is false on the opponent's
  // turn, so the board stops offering a move the server would only refuse —
  // the refusal is still the server's, this just tells the truth about it.
  const open = mark === null && winner === null && canPlay;

  const ref = useMemo(() => register(index), [register, index]);
  // A closed cell has always been a no-op — the reducer ignored it. Online it
  // would also be a round trip and a rejection, so stop it at the tap instead.
  const onClick = useCallback(() => {
    if (open) {
      dispatch(placeMark(index));
    }
  }, [dispatch, index, open]);

  const position = `${ROWS[Math.floor(index / 3)]} ${COLUMNS[index % 3]}`;

  let label = `${position}, empty`;
  if (mark !== null) {
    label = `${position}, ${mark}`;
    if (expiring) {
      label += `, disappears on ${turn}'s next move`;
    } else if (winning) {
      label += ", part of the winning line";
    }
  }

  const className = [open && "open", expiring && "expiring", winning && "winning"]
    .filter(Boolean)
    .join(" ");

  return (
    <Container
      aria-disabled={!open}
      aria-label={label}
      className={className}
      onClick={onClick}
      onKeyDown={(event) => onKeyDown(event, index)}
      ref={ref}
      type="button"
    >
      {mark !== null && <Glyph mark={mark} />}
    </Container>
  );
};
