import dateFormat from "dateformat";
import { saveGame as saveToStorage, saveExpertMode } from "../../../_storage";

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

  try {
    await saveToStorage(game, date, session);
    console.log("Game saved:", date);
  } catch (error) {
    console.error("Error saving game:", error);
  }

  // Always save expert mode preference
  saveExpertMode(game.expert);
};
