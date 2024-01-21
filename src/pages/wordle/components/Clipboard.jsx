import styled from "@emotion/styled";
import { useContext, useState } from "react";
import dateFormat from "dateformat";
import { Context } from "../context";
import { filter, map } from "lodash";
import Status from "../Status";

const Button = styled.span`
  background-color: var(--background);
  border-radius: 0.5rem;
  color: var(--foreground);
  cursor: pointer;
  padding: 0.5rem 1rem;
`;

const symbols = {
  correct: "🟩",
  present: "🟨",
  absent: "⬛",
};

const convertWordleToText = (board) => {
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
  result += `Wordleverse ${isWin ? attemptCount : "X"}/6\n\n`;

  // Convert statuses to symbols
  result += map(grid, (row) =>
    map(row, (cell) => symbols[cell] || "⬛").join("")
  ).join("\n");

  return result;
};

export const Clipboard = () => {
  const {
    state: { board },
  } = useContext(Context);
  const [copied, setCopied] = useState(null);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
    });
  };

  const handleShare = () => {
    const wordleText = convertWordleToText(board);
    copyToClipboard(wordleText);
  };

  if (copied) {
    return (
      <span style={{ fontSize: "0.75em" }}>
        <i className="fa-solid fa-check" />
        Copied to Clipboard!
      </span>
    );
  }

  return (
    <Button onClick={handleShare}>
      <i className="fa-regular fa-clipboard" /> Share Results
    </Button>
  );
};
