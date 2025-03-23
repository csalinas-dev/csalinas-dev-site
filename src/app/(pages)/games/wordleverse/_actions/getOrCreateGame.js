"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

import { defaultState } from "@wordleverse/_lib/defaults";
import { getRandomWord } from "@wordleverse/_lib/random";

/**
 * Get or create a game for a specific date
 * @param {String} date - Date in yyyy-mm-dd format
 * @returns {Object} The game data or error
 */
export const getOrCreateGame = async (date) => {
  const session = await auth();
  if (!session?.user) {
    return { error: "Unauthorized", status: 401 };
  }

  if (!date) {
    return { error: "Date parameter is required", status: 400 };
  }

  try {
    const userId = session.user.id;
    
    // Try to find an existing game for this user and date
    let game = await prisma.wordleGame.findUnique({
      where: {
        userId_date: {
          userId,
          date,
        },
      },
    });

    if (!game) {
      // If game doesn't exist, create a new one with the appropriate word
      const word = getRandomWord(date);
      game = await prisma.wordleGame.create({
        data: {
          ...defaultState,
          userId,
          date,
          word,
          guesses: [],
          completed: false,
          playable: true,
        },
      });
    }

    return game;
  } catch (error) {
    console.error("Error getting game:", error);
    return { error: "Failed to get game", status: 500 };
  }
};
