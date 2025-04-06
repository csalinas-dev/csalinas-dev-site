"use server";

import dateFormat from "dateformat";

import prisma from "@/lib/prisma";

export const setExpertMode = async (userId, expertMode) => {
  if (!userId) return null;

  const today = dateFormat(new Date(), "yyyy-mm-dd");

  // Update the current game if it exists
  const game = await prisma.wordleGame.findUnique({
    where: {
      userId_date: {
        userId,
        date: today,
      },
    },
  });

  if (game) {
    await prisma.wordleGame.update({
      where: {
        id: game.id,
      },
      data: {
        expert: expertMode,
      },
    });
  }

  return { expert: expertMode };
};
