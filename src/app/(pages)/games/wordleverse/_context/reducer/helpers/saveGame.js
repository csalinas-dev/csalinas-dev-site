import dateFormat from "dateformat";
import { saveGame as save } from "@wordleverse/_actions/saveGame";

// Synchronous function for the reducer to call
export const saveGame = (state) => {
  // This function just prepares the state for saving
  // but doesn't actually perform the async operations
  // It returns the state unchanged
  
  // Schedule the actual save operation to happen asynchronously
  setTimeout(() => {
    saveGameAsync(state);
  }, 0);
  
  return state;
};

// Separate async function that handles the actual saving
const saveGameAsync = async (state) => {
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
        guesses,
        completed: game.win !== null || game.row > 5,
      };

      await save({ gameState, date });
      console.log("Game saved to database:", date);
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
