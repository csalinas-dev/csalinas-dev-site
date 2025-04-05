"use client";

/**
 * Gets a game from localStorage
 * @param {String} date - The game date
 * @returns {Object|null} The game data or null if not found
 */
export const getGame = async (date) => {
  if (typeof window === "undefined") {
    return null;
  }
  
  const saved = localStorage.getItem(`WORDLEVERSE-${date}`);
  if (saved) {
    return JSON.parse(saved);
  }
  
  return null;
};

/**
 * Saves a game to localStorage
 * @param {Object} gameState - The game state to save
 * @param {String} date - The game date
 * @returns {Promise<Object>} The saved game state
 */
export const saveGame = async (gameState, date) => {
  if (typeof window === "undefined") {
    return gameState;
  }
  
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
  } = gameState;
  
  localStorage.setItem(`WORDLEVERSE-${date}`, JSON.stringify(game));
  return game;
};

/**
 * Gets all games from localStorage
 * @returns {Array} Array of game objects with date and gameState
 */
export const getAllGames = () => {
  if (typeof window === "undefined") {
    return [];
  }
  
  const games = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith("WORDLEVERSE-")) {
      const date = key.replace("WORDLEVERSE-", "");
      const savedGame = localStorage.getItem(key);
      
      if (savedGame) {
        const gameState = JSON.parse(savedGame);
        
        // Track guesses for history view
        const guesses = [];
        for (let i = 0; i < gameState.row; i++) {
          const rowGuess = gameState.board[i].map((cell) => cell.letter).join("");
          if (rowGuess.length === 5) {
            guesses.push(rowGuess);
          }
        }
        
        games.push({
          date,
          gameState: {
            ...gameState,
            guesses,
            completed: gameState.win !== null || gameState.row > 5,
          },
        });
      }
    }
  }
  
  return games;
};

/**
 * Removes a game from localStorage
 * @param {String} date - The game date
 */
export const removeGame = (date) => {
  if (typeof window === "undefined") {
    return;
  }
  
  localStorage.removeItem(`WORDLEVERSE-${date}`);
};