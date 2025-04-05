"use server";

import dateFormat from "dateformat";

import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

/**
 * Get user's game history from the database
 * @param {Object} options - Options for fetching history
 * @returns {Object} The history data or error
 */
export const getHistoryFromDB = async (options = {}) => {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "Unauthorized", status: 401 };
  }
  const userId = user.id;

  try {
    // Get user's game history
    const games = await prisma.wordleGame.findMany({
      where: {
        userId,
      },
      orderBy: {
        date: "desc",
      },
    });

    // Get user's streak information
    const userInfo = await prisma.user.findUnique({
      where: { id: userId },
      select: { streak: true, maxStreak: true },
    });

    const history = {
      games,
      streak: userInfo?.streak || 0,
      maxStreak: userInfo?.maxStreak || 0,
    };

    // If requested, include available dates
    const includeAvailableDates = options.includeAvailableDates === true;
    if (includeAvailableDates) {
      return {
        ...history,
        availableDates: getAvailableDatesFromDB(history.games),
      };
    }

    return history;
  } catch (error) {
    console.error("Error getting history from DB:", error);
    return { error: "Failed to get history", status: 500 };
  }
};

/**
 * Get available dates for the user from the database
 * @param {String} userId - User ID
 * @returns {Array} Array of available dates with their status
 */
function getAvailableDatesFromDB(games) {
  // Get all dates from the beginning of the game to today
  const startDate = new Date("2024-01-01T00:00:00");
  const today = new Date();
  const allDates = [];

  for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
    allDates.push(dateFormat(d, "yyyy-mm-dd"));
  }

  const playedDates = new Set(games.map((game) => game.date));
  const completedDates = new Set(
    games.filter((game) => game.completed).map((game) => game.date)
  );

  // Return all dates with their status
  return allDates.map((date) => ({
    date,
    played: playedDates.has(date),
    completed: completedDates.has(date),
    isToday: date === dateFormat(today, "yyyy-mm-dd"),
  }));
}
