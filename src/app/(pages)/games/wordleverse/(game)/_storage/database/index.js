"use client";

import { getOrCreateGame } from "@wordleverse/_actions/getOrCreateGame";
import { mergeGame as mergeGameAction } from "@wordleverse/_actions/mergeGame";
import { saveGame as saveGameAction } from "@wordleverse/_actions/saveGame";
import { convertStatus } from "@wordleverse/_lib/Status";

/**
 * Gets a game from the database
 * @param {String} date - The game date
 * @returns {Promise<Object>} The game data
 */
export const getGame = async (date) => {
  try {
    const gameData = await getOrCreateGame(date);

    if (!gameData.error && gameData) {
      // Convert database statuses to enum values
      gameData.board = gameData.board.map((row) =>
        row.map((cell) => ({
          ...cell,
          status: convertStatus(cell.status),
        }))
      );

      gameData.keyboard = gameData.keyboard.map((key) => ({
        ...key,
        status: convertStatus(key.status),
      }));

      return gameData;
    }
    
    return null;
  } catch (error) {
    console.error("Error loading game from database:", error);
    return null;
  }
};

/**
 * Derives the fields the database needs but the client state doesn't carry
 * @param {Object} gameState - The game state to save
 * @returns {Object} The game state with guesses and completed filled in
 */
const toGameData = (gameState) => {
  // Track guesses for history view; on a win, row is the winning row (not incremented)
  const guesses = [];
  const guessLimit = gameState.win ? gameState.row + 1 : gameState.row;
  for (let i = 0; i < guessLimit; i++) {
    const rowGuess = gameState.board[i].map((cell) => cell.letter).join("");
    if (rowGuess.length === 5) {
      guesses.push(rowGuess);
    }
  }

  return {
    ...gameState,
    guesses,
    completed: gameState.win !== null || gameState.row > 5,
  };
};

/**
 * Saves a game to the database
 * @param {Object} gameState - The game state to save
 * @param {String} date - The game date
 * @returns {Promise<Object>} The result of the save operation
 */
export const saveGame = async (gameState, date) => {
  try {
    const result = await saveGameAction({
      gameState: toGameData(gameState),
      date,
    });
    return result;
  } catch (error) {
    console.error("Error saving game to database:", error);
    throw error;
  }
};

/**
 * Saves a game to the database only if it beats the game already stored for
 * that date. Used when migrating localStorage games on sign-in.
 * @param {Object} gameState - The game state to merge in
 * @param {String} date - The game date
 * @returns {Promise<Object>} { game, replaced } or an error object
 */
export const mergeGame = async (gameState, date) => {
  try {
    const result = await mergeGameAction({
      gameState: toGameData(gameState),
      date,
    });
    return result;
  } catch (error) {
    console.error("Error merging game into database:", error);
    throw error;
  }
};