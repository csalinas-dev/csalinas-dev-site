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
    const games = await prisma.wordleHistory.findMany({
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
      const availableDates = await getAvailableDatesFromDB(userId);
      return {
        ...history,
        availableDates
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
export async function getAvailableDatesFromDB(userId) {
  if (!userId) return [];

  // Get all dates from the beginning of the game to today
  const startDate = new Date("2024-01-01");
  const today = new Date();
  const allDates = [];

  for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
    allDates.push(dateFormat(d, "yyyy-mm-dd"));
  }

  // Get all games the user has played
  const playedGames = await prisma.wordleGame.findMany({
    where: {
      userId,
    },
    select: {
      date: true,
      completed: true,
    },
  });

  const playedDates = new Set(playedGames.map((game) => game.date));
  const completedDates = new Set(
    playedGames.filter((game) => game.completed).map((game) => game.date)
  );

  // Return all dates with their status
  return allDates.map((date) => ({
    date,
    played: playedDates.has(date),
    completed: completedDates.has(date),
    isToday: date === dateFormat(today, "yyyy-mm-dd"),
  }));
}

/**
 * Get game details from the database
 * @param {String} date - Date in yyyy-mm-dd format
 * @returns {Object} Game details or error
 */
export const getGameDetailsFromDB = async (date) => {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "Unauthorized", status: 401 };
  }

  try {
    const userId = user.id;
    
    // Find the game in history
    const game = await prisma.wordleHistory.findFirst({
      where: {
        userId,
        date,
      },
    });

    if (!game) {
      return { error: "Game not found", status: 404 };
    }

    // Get the full game details if needed
    const gameDetails = await prisma.wordleGame.findUnique({
      where: {
        userId_date: {
          userId,
          date,
        },
      },
    });

    return {
      ...game,
      board: gameDetails?.board || null,
      guesses: gameDetails?.guesses || [],
    };
  } catch (error) {
    console.error("Error getting game details from DB:", error);
    return { error: "Failed to get game details", status: 500 };
  }
};