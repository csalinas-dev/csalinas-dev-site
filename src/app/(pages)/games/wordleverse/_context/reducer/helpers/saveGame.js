import dateFormat from "dateformat";
import { saveGame as save } from "@wordleverse/_actions/saveGame";

export const saveGame = async (state) => {
  const {
    error,
    guess,
    title,
    word,
    wordsRemaining,
    session,
    gameDate,
    isPastGame,
    ...game
  } = state;

  if (title !== null) {
    return;
  }

  const today = dateFormat(new Date(), "yyyy-mm-dd");
  const date = gameDate || today;

  // If user is authenticated, save to database
  if (session?.user) {
    try {
      // Convert enum values to strings for database storage
      const dbBoard = game.board.map((row) =>
        row.map((cell) => ({
          ...cell,
          status: cell.status.toString().toLowerCase(),
        }))
      );

      const dbKeyboard = game.keyboard.map((key) => ({
        ...key,
        status: key.status.toString().toLowerCase(),
      }));

      // Track guesses for history view
      const guesses = [];
      for (let i = 0; i < game.row; i++) {
        const rowGuess = game.board[i].map((cell) => cell.letter).join("");
        if (rowGuess.length === 5) {
          guesses.push(rowGuess);
        }
      }

      const gameState = {
        ...game,
        board: dbBoard,
        keyboard: dbKeyboard,
        guesses,
        completed: game.win !== null || game.row > 5,
      };

      await save({ gameState, date });
    } catch (error) {
      console.error("Error saving game to database:", error);
      // Fallback to localStorage if database save fails
      localStorage.setItem(`WORDLEVERSE-${date}`, JSON.stringify(game));
    }
  } else {
    // For non-authenticated users, use localStorage
    localStorage.setItem(`WORDLEVERSE-${date}`, JSON.stringify(game));
  }

  // Always save expert mode preference to localStorage for convenience
  localStorage.setItem("expert", game.expert);
};
