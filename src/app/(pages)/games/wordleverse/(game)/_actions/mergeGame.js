"use server";

import dateFormat from "dateformat";

import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { isBetterGame } from "@wordleverse/_lib/compare";

import { saveGame } from "./saveGame";

/**
 * Save a game only if it beats what is already stored for that date.
 *
 * Used by the localStorage → database migration that runs on sign-in. Plain
 * `saveGame` upserts unconditionally, which would let a device with a worse
 * (or barely started) copy of a date overwrite a better one played elsewhere.
 * The comparison happens here, server-side, so the client never has to read the
 * existing record just to decide whether to write.
 *
 * @param {Object} data - Object containing gameState and date
 * @returns {Object} { game, replaced } or an error object
 */
export async function mergeGame(data) {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "Unauthorized", status: 401 };
  }

  try {
    const { gameState } = data;
    const date = data.date || dateFormat(new Date(), "yyyy-mm-dd");

    const existing = await prisma.wordleGame.findUnique({
      where: { userId_date: { userId: user.id, date } },
    });

    if (existing && !isBetterGame(gameState, existing)) {
      return { game: existing, replaced: false };
    }

    // saveGame upserts and handles the streak update for today's game.
    const game = await saveGame({ gameState, date });
    if (game?.error) {
      return game;
    }

    return { game, replaced: true };
  } catch (error) {
    console.error("Error merging game:", error);
    return { error: "Failed to merge game", status: 500 };
  }
}
