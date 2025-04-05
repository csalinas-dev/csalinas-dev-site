import { useContext, useState } from "react";
import dateFormat from "dateformat";
import { filter, map } from "lodash";
import styled from "@emotion/styled";

import { Context } from "@wordleverse/_context";
import Status from "@wordleverse/_lib/Status";

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
  absent: "⬛",
};

const convertWordleToText = (board, expert) => {
  // Convert current board to grid of statuses
  const grid = filter(
    map(board, (row) => map(row, (cell) => cell.status)),
    (row) => row.some((cell) => cell !== Status.Default)
  );

  // Metadata
  let attemptCount = grid.length;
  let isWin = grid.some((row) => row.every((cell) => cell === Status.Correct));

  // Title
  const now = new Date();
  const date = dateFormat(now, "mmmm dS, yyyy");
  let result = `${date}\n`;
  result += "Wordleverse ";
  result += isWin ? attemptCount : "X";
  result += "/6";
  result += expert ? "*" : "";
  result += "\n\n";

  // Convert statuses to symbols
  result += map(grid, (row) =>
    map(row, (cell) => symbols[cell] || "⬛").join("")
  ).join("\n");

  return result;
};

export const Clipboard = () => {
  const {
    state: { board, expert },
  } = useContext(Context);
  const [copied, setCopied] = useState(null);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
    });
  };

  const handleShare = () => {
    const wordleText = convertWordleToText(board, expert);
    copyToClipboard(wordleText);
  };

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
