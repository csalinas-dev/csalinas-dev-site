"use server";

import dateFormat from "dateformat";

import prisma from "@/lib/prisma";

// Update user's streak
export const updateStreak = async (userId, isWin) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { streak: true, maxStreak: true, lastPlayedDate: true },
  });

  if (!user) return;

  const today = dateFormat(new Date(), "yyyy-mm-dd");
  const yesterday = dateFormat(new Date(Date.now() - 86400000), "yyyy-mm-dd");

  let newStreak = 0;
  let newMaxStreak = user.maxStreak;

  // Streak = consecutive days played (completed), win or loss
  if (user.lastPlayedDate === yesterday) {
    newStreak = user.streak + 1;
  } else {
    newStreak = 1;
  }

  if (newStreak > user.maxStreak) {
    newMaxStreak = newStreak;
  }

  // Update user's streak information
  await prisma.user.update({
    where: { id: userId },
    data: {
      streak: newStreak,
      maxStreak: newMaxStreak,
      lastPlayedDate: today,
    },
  });
};
