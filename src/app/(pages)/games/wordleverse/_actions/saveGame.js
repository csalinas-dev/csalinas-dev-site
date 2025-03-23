"use server";

import dateFormat from "dateformat";
import { getSession } from "next-auth/react";

import prisma from "@/lib/prisma";

import { updateStreak } from "./updateStreak";

/**
 * Save game state
 * @param {Object} data - Object containing gameState and date
 * @returns {Object} The updated game data or error
 */
export async function saveGame(data) {
  const session = await getSession();
  if (!session?.user) {
    return { error: "Unauthorized", status: 401 };
  }

  try {
    const userId = session.user.id;
    const {
      gameState: { board, keyboard, row, expert, win, completed, guesses = [] },
      date,
    } = data;

    const gameDate = date || dateFormat(new Date(), "yyyy-mm-dd");
    const today = dateFormat(new Date(), "yyyy-mm-dd");

    // Update the game
    const updatedGame = await prisma.wordleGame.update({
      where: {
        userId_date: {
          userId,
          date: gameDate,
        },
      },
      data: {
        board,
        keyboard,
        guesses,
        row,
        expert,
        win,
        completed,
        playable: !completed,
      },
    });

    // If the game is completed, add to history and update streak
    if (completed && updatedGame.win !== null) {
      await prisma.wordleHistory.upsert({
        where: {
          userId_date: {
            userId,
            date: gameDate,
          },
        },
        update: {
          guesses: updatedGame.win ? row : null,
          win: updatedGame.win,
        },
        create: {
          userId,
          date: gameDate,
          word: updatedGame.word,
          guesses: updatedGame.win ? row : null,
          win: updatedGame.win,
        },
      });

      // Only update streak for today's game
      if (gameDate === today) {
        await updateStreak(userId, updatedGame.win);
      }
    }

    return updatedGame;
  } catch (error) {
    console.error("Error saving game:", error);
    return { error: "Failed to save game", status: 500 };
  }
}
