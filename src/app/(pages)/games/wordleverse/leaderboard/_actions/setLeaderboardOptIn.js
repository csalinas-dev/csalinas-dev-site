"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

/**
 * Set whether the signed-in user appears on the Wordleverse leaderboard.
 *
 * The row updated is always the caller's own — the id comes from the session,
 * never from the argument — and the argument is coerced, because everything a
 * server action is handed is attacker-controlled.
 * @param {Boolean} optIn - Whether to list the caller
 * @returns {Object} The stored value, or an error
 */
export const setLeaderboardOptIn = async (optIn) => {
  const showOnLeaderboard = Boolean(optIn);

  try {
    // Inside the try on purpose: getCurrentUser() does a Prisma read, so it can
    // throw. Everything this action can fail at has to come back as a returned
    // error, because the caller is an optimistic switch and a rejected promise
    // would leave it showing the opposite of what is stored.
    const user = await getCurrentUser();
    if (!user) {
      return { error: "Unauthorized", status: 401 };
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { showOnLeaderboard },
    });

    revalidatePath("/games/wordleverse/leaderboard");

    return { optIn: showOnLeaderboard };
  } catch (error) {
    console.error("Error setting leaderboard opt-in:", error);
    return { error: "Failed to update leaderboard setting", status: 500 };
  }
};
