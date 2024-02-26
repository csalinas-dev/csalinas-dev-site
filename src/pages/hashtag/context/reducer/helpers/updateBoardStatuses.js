import Status from "pages/wordle/Status";

export const updateBoardStatuses = ({ words, target }, board) =>
  board.map((tile, index) => {
    if (!tile) {
      return null;
    }

    const { letter } = tile;

    if (target[index].letter === letter) {
      return { ...tile, status: Status.Correct };
    }

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
    const combined = targetWords.join("");
    const isPresent = combined.includes(letter);
    return {
      ...tile,
      status: isPresent ? Status.Present : Status.Absent,
    };
  });
