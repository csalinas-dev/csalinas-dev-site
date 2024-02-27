import { reduce } from "lodash";
import Status from "pages/wordle/Status";

const getLetterStatuses = (words, board, target) => {
  const letterCounts = {};
  words.forEach((word) => {
    letterCounts[word] = {};
    for (let letter of word) {
      letterCounts[word][letter] = (letterCounts[word][letter] || 0) + 1;
    }
  });

  const reduceCounts = (letter, targetWords) =>
    targetWords.forEach((word) => {
      if (letterCounts[word][letter] > 0) {
        letterCounts[word][letter] -= 1;
      }
    });

  const getCount = (letter, targetWords) =>
    reduce(
      targetWords,
      (sum, word) => sum + (letterCounts[word][letter] || 0),
      0
    );

  const getTargetWords = (index) => {
    const row = Math.floor(index / 5);
    const col = index % 5;
    let targetWords = [];
    if (row === 1) {
      targetWords.push(words[0]);
    }
    if (col === 3) {
      targetWords.push(words[1]);
    }
    if (row === 3) {
      targetWords.push(words[2]);
    }
    if (col === 1) {
      targetWords.push(words[3]);
    }
    return targetWords;
  };

  const letterStatuses = [];

  // Handle correct letters first
  board.forEach((tile, index) => {
    if (!tile) {
      return;
    }
    const targetWords = getTargetWords(index);
    const { letter } = tile;
    if (target[index].letter === letter) {
      reduceCounts(letter, targetWords);
      letterStatuses.push({ ...tile, status: Status.Correct });
    }
  });

  // Handle present letters next
  board.forEach((tile, index) => {
    if (!tile || letterStatuses.some((newTile) => newTile.key === tile.key)) {
      return;
    }
    const targetWords = getTargetWords(index);
    const { letter } = tile;
    if (getCount(letter, targetWords) === 0) {
      return;
    }
    if (targetWords.join("").includes(letter)) {
      reduceCounts(letter, targetWords);
      letterStatuses.push({ ...tile, status: Status.Present });
    }
  });

  // Handle absent letters last
  board.forEach((tile) => {
    if (!tile || letterStatuses.some((newTile) => newTile.key === tile.key)) {
      return;
    }

    letterStatuses.push({ ...tile, status: Status.Absent });
  });

  return letterStatuses;
};

export const updateBoardStatuses = ({ words, target }, board) => {
  const statuses = getLetterStatuses(words, board, target);
  const newBoard = board.map((tile) =>
    !tile ? null : statuses.find((status) => status.key === tile.key)
  );
  return newBoard;
};
