import dateFormat from "dateformat";
import {
  saveGame as saveToStorage,
  saveExpertMode,
} from "@wordleverse/_storage";

// Get the session from the global context
// This is a workaround to avoid having to pass the session through every component
let currentSession = null;
export const setCurrentSession = (session) => {
  currentSession = session;
};

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
    gameDate,
    isPastGame,
    ...game
  } = state;

  if (title !== null) {
    return;
  }

  const today = dateFormat(new Date(), "yyyy-mm-dd");
  const date = gameDate || today;

  try {
    // Use the session from the global context
    await saveToStorage(game, date, currentSession);
  } catch (error) {
    console.error("Error saving game:", error);
  }

  // Always save expert mode preference
  saveExpertMode(game.expert);
};
