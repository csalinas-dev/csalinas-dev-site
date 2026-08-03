"use client";

import * as databaseStorage from "./database";
import * as localStorageStorage from "./localStorage";

/**
 * Determines which storage mechanism to use based on authentication status
 * @param {Object} session - The user's session object
 * @returns {Object} The appropriate storage mechanism
 */
const getStorageProvider = (session) => {
  if (session?.user) {
    return databaseStorage;
  }
  return localStorageStorage;
};

/**
 * Gets a game from the appropriate storage
 * @param {String} date - The game date
 * @param {Object} session - The user's session
 * @param {String} status - The authentication status
 * @returns {Promise<Object>} The game data
 */
export const getGame = async (date, session, status) => {
  if (status === "loading") {
    return null;
  }
  
  const storage = getStorageProvider(session);
  return storage.getGame(date);
};

/**
 * Saves a game to the appropriate storage
 * @param {Object} gameState - The game state to save
 * @param {String} date - The game date
 * @param {Object} session - The user's session
 * @returns {Promise<Object>} The result of the save operation
 */
export const saveGame = async (gameState, date, session) => {
  const storage = getStorageProvider(session);
  return storage.saveGame(gameState, date);
};

/**
 * Migrates games from localStorage to database when a user logs in.
 *
 * A date can already exist in the database if the player played it on another
 * device while signed in. Those conflicts are resolved server-side by
 * `mergeGame`, which keeps the better-performing game (see _lib/compare.js) —
 * the local copy only overwrites the stored one when it beats it. Either way
 * the database is authoritative afterwards, so the local copy is removed.
 *
 * @param {Object} session - The user's session
 * @returns {Promise<void>}
 */
export const migrateGames = async (session) => {
  if (!session?.user) {
    return;
  }

  const games = localStorageStorage.getAllGames();
  if (games.length === 0) {
    return;
  }

  console.log(`Found ${games.length} games to migrate from localStorage to database`);

  for (const game of games) {
    try {
      const result = await databaseStorage.mergeGame(game.gameState, game.date);
      if (result?.error) {
        throw new Error(result.error);
      }
      localStorageStorage.removeGame(game.date);
      console.log(
        result.replaced
          ? `Migrated game from ${game.date} to database`
          : `Kept the database game for ${game.date} — it beat the local one`
      );
    } catch (error) {
      console.error(`Failed to migrate game from ${game.date} to database:`, error);
    }
  }
};

/**
 * Saves the expert mode preference to localStorage
 * @param {Boolean} expertMode - Whether expert mode is enabled
 */
export const saveExpertMode = (expertMode) => {
  if (typeof window !== "undefined") {
    localStorage.setItem("expert", expertMode);
  }
};

/**
 * Gets the expert mode preference from localStorage
 * @returns {Boolean} Whether expert mode is enabled
 */
export const getExpertMode = () => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("expert") === "true";
  }
  return false;
};