"use client";

import dateFormat from "dateformat";

/**
 * Get user's game history from localStorage
 * @param {Object} options - Options for fetching history
 * @returns {Object} The history data
 */
export const getHistoryFromLocalStorage = (options = {}) => {
  const localHistory = [];
  let streak = 0;
  let maxStreak = 0;

  if (typeof window !== "undefined") {
    // Get all localStorage keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith("WORDLEVERSE-")) {
        try {
          const date = key.replace("WORDLEVERSE-", "");
          const gameData = JSON.parse(localStorage.getItem(key));

          if (gameData.win !== null) {
            localHistory.push({
              date,
              word: gameData.word || "?????",
              guesses: gameData.win ? gameData.row : null,
              win: gameData.win,
            });
          }
        } catch (error) {
          console.error("Error parsing localStorage item:", error);
        }
      }
    }

    // Calculate streak (simplified version for localStorage)
    if (localHistory.length > 0) {
      // Sort by date (newest first)
      localHistory.sort((a, b) => new Date(b.date) - new Date(a.date));

      // Calculate current streak
      let currentStreak = 0;
      const today = dateFormat(new Date(), "yyyy-mm-dd");
      const yesterday = dateFormat(
        new Date(Date.now() - 86400000),
        "yyyy-mm-dd"
      );

      for (let i = 0; i < localHistory.length; i++) {
        const game = localHistory[i];
        const gameDate = game.date;

        if (
          i === 0 &&
          (gameDate === today || gameDate === yesterday) &&
          game.win
        ) {
          currentStreak = 1;
        } else if (i > 0) {
          const prevGame = localHistory[i - 1];
          const dayDiff = Math.round(
            (new Date(prevGame.date) - new Date(gameDate)) /
              (1000 * 60 * 60 * 24)
          );

          if (dayDiff === 1 && game.win) {
            currentStreak++;
          } else {
            break;
          }
        }
      }

      streak = currentStreak;
      maxStreak = Math.max(
        ...localHistory
          .filter((game) => game.win)
          .map((game) => game.guesses || 0)
      );
    }
  }

  const history = {
    games: localHistory,
    streak,
    maxStreak,
  };

  // If requested, include available dates
  const includeAvailableDates = options.includeAvailableDates === true;
  if (includeAvailableDates) {
    const availableDates = getAvailableDatesFromLocalStorage(localHistory);
    return {
      ...history,
      availableDates
    };
  }
  
  return history;
};

/**
 * Get available dates from localStorage
 * @param {Array} localHistory - Array of games from localStorage
 * @returns {Array} Array of available dates with their status
 */
export const getAvailableDatesFromLocalStorage = (localHistory = []) => {
  // Create available dates for localStorage (simplified)
  const today = new Date();
  const availableDates = [];
  
  // Go back 90 days to show a reasonable calendar history
  for (let i = 0; i < 90; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = dateFormat(date, "yyyy-mm-dd");
    const game = localHistory.find((g) => g.date === dateStr);

    availableDates.push({
      date: dateStr,
      played: !!game,
      completed: !!game,
      isToday: i === 0,
    });
  }

  return availableDates;
};

/**
 * Get game details from localStorage
 * @param {String} date - Date in yyyy-mm-dd format
 * @returns {Object} Game details or error
 */
export const getGameDetailsFromLocalStorage = (date) => {
  if (typeof window === "undefined") {
    return { error: "Cannot access localStorage", status: 500 };
  }

  try {
    const key = `WORDLEVERSE-${date}`;
    const gameData = localStorage.getItem(key);
    
    if (!gameData) {
      return { error: "Game not found", status: 404 };
    }

    const parsedData = JSON.parse(gameData);
    
    return {
      date,
      word: parsedData.word || "?????",
      guesses: parsedData.win ? parsedData.row : null,
      win: parsedData.win,
      board: parsedData.board || null,
    };
  } catch (error) {
    console.error("Error getting game details from localStorage:", error);
    return { error: "Failed to get game details", status: 500 };
  }
};