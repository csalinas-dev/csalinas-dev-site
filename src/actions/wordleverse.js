"use server";

import { getSession, getCurrentUser } from "@/app/auth";
import { getOrCreateGame, saveGameState, getGameByDate, getUserGameHistory, getAvailableDates } from "@/lib/wordleverse-db";
import { getRandomWordForDate } from "@/app/(pages)/games/wordleverse/_context/random";
import dateFormat from "dateformat";

// Helper function to get word for a specific date
function getWordForDate(date) {
  return getRandomWordForDate(date);
}

/**
 * Get a game for a specific date
 * @param {Object} formData - Form data containing the date
 * @returns {Object} The game data or error
 */
export async function getGame(formData) {
  const session = await getSession();
  if (!session?.user) {
    return { error: "Unauthorized", status: 401 };
  }

  const date = formData.get("date");

  if (!date) {
    return { error: "Date parameter is required", status: 400 };
  }

  try {
    const today = dateFormat(new Date(), "yyyy-mm-dd");
    const isPastGame = date !== today;
    
    // Check if the game already exists
    let game = await getGameByDate(session.user.id, date);
    
    if (!game) {
      // If game doesn't exist, create a new one with the appropriate word
      const word = getWordForDate(date);
      game = await getOrCreateGame(session.user.id, word, date);
    }
    
    return game;
  } catch (error) {
    console.error("Error getting game:", error);
    return { error: "Failed to get game", status: 500 };
  }
}

/**
 * Save game state
 * @param {Object} data - Object containing gameState and date
 * @returns {Object} The updated game data or error
 */
export async function saveGame(data) {
  const session = await getSession();
  if (!session?.user) {
    return { error: "Unauthorized", status: 401 };
  }

  try {
    const { gameState, date } = data;
    
    const updatedGame = await saveGameState(session.user.id, gameState, date);
    
    return updatedGame;
  } catch (error) {
    console.error("Error saving game:", error);
    return { error: "Failed to save game", status: 500 };
  }
}

/**
 * Get user's game history
 * @param {Object} options - Options object
 * @param {boolean} options.includeAvailableDates - Whether to include available dates
 * @returns {Object} The history data or error
 */
export async function getHistory(options = {}) {
  const session = await getSession();
  if (!session?.user) {
    return { error: "Unauthorized", status: 401 };
  }

  try {
    const includeAvailableDates = options.includeAvailableDates === true;
    
    // Get user's game history with streak information
    const history = await getUserGameHistory(session.user.id);
    
    // If requested, include available dates
    if (includeAvailableDates) {
      const availableDates = await getAvailableDates(session.user.id);
      return {
        ...history,
        availableDates
      };
    }
    
    return history;
  } catch (error) {
    console.error("Error getting history:", error);
    return { error: "Failed to get history", status: 500 };
  }
}