"use server";

import dateFormat from "dateformat";

import prisma from "@/lib/prisma";

// Update user's streak
export const updateStreak = async (userId, isWin) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { streak, maxStreak, lastPlayedDate },
  });

  if (!user) return;

  const today = dateFormat(new Date(), "yyyy-mm-dd");
  const yesterday = dateFormat(new Date(Date.now() - 86400000), "yyyy-mm-dd");
  
  let newStreak = 0;
  let newMaxStreak = user.maxStreak;

  if (isWin) {
    // If user won and played yesterday, increment streak
    if (user.lastPlayedDate === yesterday) {
      newStreak = user.streak + 1;
    }
    // If user won but didn't play yesterday, reset streak to 1
    else {
      newStreak = 1;
    }
    
    // Update max streak if needed
    if (newStreak > user.maxStreak) {
      newMaxStreak = newStreak;
    }
  } else {
    // If user lost, reset streak to 0
    newStreak = 0;
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
}