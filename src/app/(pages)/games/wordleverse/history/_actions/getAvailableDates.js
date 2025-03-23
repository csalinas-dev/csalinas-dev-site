"use server";

import dateFormat from "dateformat";

import prisma from "@/lib/prisma";

export async function getAvailableDates(userId) {
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
