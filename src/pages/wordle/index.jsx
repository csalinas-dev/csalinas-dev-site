/**
 * References
 *    https://kennethscoggins.medium.com/how-to-build-wordle-using-reactjs-and-about-200-lines-of-sloppy-code-3da3ef47013f
 *    https://css-tricks.com/snippets/css/complete-guide-grid/
 **/ 

import { useEffect, useState } from "react";

import { Section } from "../../components";
import { defaultBoard } from "./defaults";
import { Title, Board, Tile, section } from "./styles";

import words from "./words.json";

export const Wordle = () => {
  const [board, setBoard] = useState(defaultBoard);
  const [currentRow, setCurrentRow] = useState(0);
  const [currentWord, setCurrentWord] = useState("");
  const [currentGuess, setCurrentGuess] = useState("");
  const [gameOver, setGameOver] = useState(false);

  return (
    <Section css={section}>
      <Title>Wordle</Title>
      <Board>
        {board.map((word) =>
          word.map(({ c, status }) => <Tile className={status}>{c}</Tile>)
        )}
      </Board>
    </Section>
  );
};
