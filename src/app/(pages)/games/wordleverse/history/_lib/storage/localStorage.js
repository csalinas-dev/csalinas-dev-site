"use client";

import dateFormat from "dateformat";

const DEFAULT_HISTORY = {
  games: [],
  streak: 0,
  maxStreak: 0,
  guessCounts: [0, 0, 0, 0, 0, 0],
};

/**
 * Get user's game history from localStorage
 * @param {Object} options - Options for fetching history
 * @returns {Object} The history data
 */
export const getHistoryFromLocalStorage = (options = {}) => {
  if (typeof window === "undefined") {
    return options.includeAvailableDates
      ? { ...DEFAULT_HISTORY, availableDates: [] }
      : { ...DEFAULT_HISTORY };
  }

  const localHistory = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith("WORDLEVERSE-")) continue;

    try {
      const date = key.replace("WORDLEVERSE-", "");
      const gameData = JSON.parse(localStorage.getItem(key));

      // Collect only submitted guesses; on a win, row is the winning row (not incremented)
      const guesses = [];
      const guessLimit = gameData.win ? gameData.row + 1 : gameData.row;
      for (let j = 0; j < guessLimit; j++) {
        const word = gameData.board[j].map((cell) => cell.letter).join("");
        if (word.length === 5) guesses.push(word);
      }

      const completed = gameData.win !== null;
      const playable = !completed && gameData.row < 6;

      localHistory.push({
        date,
        completed,
        playable,
        ...gameData,
        guesses,
      });
    } catch (error) {
      console.error("Error parsing localStorage item:", error);
    }
  }

  // Sort newest first for streak calculation
  localHistory.sort((a, b) => new Date(b.date) - new Date(a.date));

  const today = dateFormat(new Date(), "yyyy-mm-dd");
  const yesterday = dateFormat(new Date(Date.now() - 86400000), "yyyy-mm-dd");

  // Streak = consecutive days played (completed), win or loss
  const completedGames = localHistory.filter((g) => g.completed);
  let streak = 0;
  for (let i = 0; i < completedGames.length; i++) {
    if (i === 0) {
      if (completedGames[i].date === today || completedGames[i].date === yesterday) {
        streak = 1;
      } else {
        break; // Most recent game was before yesterday — no active streak
      }
    } else {
      const prev = new Date(completedGames[i - 1].date);
      const curr = new Date(completedGames[i].date);
      const dayDiff = Math.round((prev - curr) / (1000 * 60 * 60 * 24));
      if (dayDiff === 1) {
        streak++;
      } else {
        break;
      }
    }
  }

  // Max streak: longest consecutive-day-played run across all history
  let maxStreak = 0;
  let runStreak = 0;
  for (let i = 0; i < completedGames.length; i++) {
    if (i === 0) {
      runStreak = 1;
    } else {
      const prev = new Date(completedGames[i - 1].date);
      const curr = new Date(completedGames[i].date);
      const dayDiff = Math.round((prev - curr) / (1000 * 60 * 60 * 24));
      if (dayDiff === 1) {
        runStreak++;
      } else {
        maxStreak = Math.max(maxStreak, runStreak);
        runStreak = 1;
      }
    }
  }
  maxStreak = Math.max(maxStreak, runStreak);

  // Guess distribution (wins only)
  const guessCounts = [0, 0, 0, 0, 0, 0];
  localHistory.forEach((game) => {
    if (game.win) {
      const count = game.guesses.length;
      if (count >= 1 && count <= 6) guessCounts[count - 1]++;
    }
  });

  const history = { games: localHistory, streak, maxStreak, guessCounts };

  if (options.includeAvailableDates === true) {
    return {
      ...history,
      availableDates: getAvailableDatesFromLocalStorage(localHistory),
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
  const today = new Date();
  const availableDates = [];

  // Show last 90 days
  for (let i = 0; i < 90; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = dateFormat(date, "yyyy-mm-dd");
    const game = localHistory.find((g) => g.date === dateStr);

    availableDates.push({
      date: dateStr,
      played: !!game,
      completed: game?.completed || false,
      isToday: i === 0,
    });
  }

  return availableDates;
};
