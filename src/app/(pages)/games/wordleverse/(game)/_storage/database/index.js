"use client";

import { getOrCreateGame } from "@wordleverse/_actions/getOrCreateGame";
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
 * Saves a game to the database
 * @param {Object} gameState - The game state to save
 * @param {String} date - The game date
 * @returns {Promise<Object>} The result of the save operation
 */
export const saveGame = async (gameState, date) => {
  try {
    // Track guesses for history view
    const guesses = [];
    for (let i = 0; i < gameState.row; i++) {
      const rowGuess = gameState.board[i].map((cell) => cell.letter).join("");
      if (rowGuess.length === 5) {
        guesses.push(rowGuess);
      }
    }

    const gameData = {
      ...gameState,
      guesses,
      completed: gameState.win !== null || gameState.row > 5,
    };

    const result = await saveGameAction({ gameState: gameData, date });
    return result;
  } catch (error) {
    console.error("Error saving game to database:", error);
    throw error;
  }
};