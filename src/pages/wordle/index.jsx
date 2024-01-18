/**
 * References
 *    https://kennethscoggins.medium.com/how-to-build-wordle-using-reactjs-and-about-200-lines-of-sloppy-code-3da3ef47013f
 *    https://css-tricks.com/snippets/css/complete-guide-grid/
 **/

import { useState } from "react";

import { Status, defaultBoard } from "./defaults";
import { Title, Wordle, Tile } from "./styles";
import { useResponsiveTiles } from "./useResponsiveTiles";
import { Keyboard } from './keyboard';

// import words from "./words.json";

export const WordleGame = () => {
  const [tileRef, tileSize] = useResponsiveTiles();

  // eslint-disable-next-line no-unused-vars
  const [board, _] = useState(defaultBoard);
  // const [currentRow, setCurrentRow] = useState(0);
  // const [currentWord, setCurrentWord] = useState("");
  // const [currentGuess, setCurrentGuess] = useState("");
  // const [gameOver, setGameOver] = useState(false);

  const letterToTile = ({ key, c, status: className }, i) => {
    const font = tileSize * .75 + 'px';
    const props = {
      key,
      className,
      style: {
        width: tileSize,
        lineHeight: font,
        fontSize: font,
      },
    };
    if (i === 0) {
      props.ref = tileRef;
      props.className = Status.Present;
    }
    if (i === 1) {
      props.className = Status.Correct;
    }
    const alphabet = ['a','b','c','d','e'];
    return <Tile {...props}>{alphabet[i].toUpperCase()}</Tile>;
  };

  return (
    <Wordle>
      <Title>Wordle</Title>
      {board.map((word) => word.map(letterToTile))}
      <Keyboard />
    </Wordle>
  );
};
