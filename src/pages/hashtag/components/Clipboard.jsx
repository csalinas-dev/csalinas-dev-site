import { useCallback, useContext, useState } from "react";
import styled from "@emotion/styled";
import dateFormat from "dateformat";
import { map } from "lodash";
import { Context } from "../context";
import Status from "../Status";

const Button = styled.span`
  align-items: center;
  background-color: var(--background);
  border-radius: 0.5rem;
  color: var(--foreground);
  cursor: pointer;
  display: flex;
  flex-flow: row nowrap;
  font-size: 1rem;
  justify-content: center;
  line-height: 1rem;
  padding: 0.5rem 1rem;

  @media (min-width: 768px) {
    font-size: 1.25rem;
    line-height: 1.25rem;
    padding: 1rem 2rem;
  }
`;

const Copied = styled.span`
  font-size: 0.75em;
  user-select: none;
`;

const symbols = {
  correct: "🟩",
  present: "🟨",
  absent: "⬜",
  default: "▪️",
};

const getStars = (left) => {
  const moves = 20 - left;
  if (moves <= 10) {
    return "⭐⭐⭐";
  }
  if (moves <= 15) {
    return "⭐⭐";
  }
  return "⭐";
};

const getWinText = (moves) => {
  const now = new Date();
  const date = dateFormat(now, "mmmm dS, yyyy");
  let result = `${date}\nHashtag ${getStars(moves)}\n`;
  result += `You won in ${20 - moves} moves!`;
  return result;
};

const getLossText = (board) => {
  const now = new Date();
  const date = dateFormat(now, "mmmm dS, yyyy");
  let result = `${date}\nHashtag ❌\n\n`;
  result += map(board, (cell, i) => {
    const status = cell?.status ?? Status.Default;
    let t = symbols[status];
    if (i % 5 === 4 && i !== board.lenght - 1) {
      t += "\n";
    }
    return t;
  }).join("");

  return result;
};

export const Clipboard = () => {
  const {
    state: { shareBoard: board, moves, win },
  } = useContext(Context);
  const [copied, setCopied] = useState(null);

  const handleShare = useCallback(() => {
    const text = win ? getWinText(moves) : getLossText(board);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
    });
  }, [board, moves, win, setCopied]);

  if (copied) {
    return (
      <Copied>
        <i className="fa-solid fa-check" />
        Copied to Clipboard!
      </Copied>
    );
  }

  return (
    <Button onClick={handleShare}>
      <i className="fa-regular fa-clipboard" /> Share Results
    </Button>
  );
};
