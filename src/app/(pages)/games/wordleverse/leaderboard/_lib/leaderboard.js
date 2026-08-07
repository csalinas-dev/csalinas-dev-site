import dateFormat from "dateformat";

import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

import { rankAllTime, rankToday } from "./rank";

/**
 * Read both boards for the leaderboard page.
 *
 * Only users who have opted in (`User.showOnLeaderboard`) are queried at all,
 * so a player who has never flipped the switch cannot appear even by accident.
 * The aggregation runs in JS rather than SQL because the guess count lives in a
 * JSON column and this is a personal site with a small user table.
 *
 * "Today" is `dateFormat(new Date(), "yyyy-mm-dd")` — server-local, exactly how
 * `(game)/_actions/saveGame.js` writes `WordleGame.date`. Any other definition
 * silently empties the board around midnight.
 * @returns {Object} { date, signedIn, optedIn, today, allTime }
 */
export const getLeaderboard = async () => {
  const date = dateFormat(new Date(), "yyyy-mm-dd");
  let user = null;

  try {
    user = await getCurrentUser();

    const [games, users, viewer] = await Promise.all([
      prisma.wordleGame.findMany({
        where: {
          date,
          completed: true,
          win: { not: null },
          user: { is: { showOnLeaderboard: true } },
        },
        select: {
          win: true,
          guesses: true,
          row: true,
          expert: true,
          updatedAt: true,
          userId: true,
          user: { select: { name: true } },
        },
      }),
      prisma.user.findMany({
        where: { showOnLeaderboard: true },
        select: {
          id: true,
          name: true,
          streak: true,
          maxStreak: true,
          wordleGames: {
            where: { completed: true },
            select: { win: true, guesses: true, row: true },
          },
        },
      }),
      // getCurrentUser does not select the flag, so ask for it separately.
      user
        ? prisma.user.findUnique({
            where: { id: user.id },
            select: { showOnLeaderboard: true },
          })
        : null,
    ]);

    return {
      date,
      signedIn: Boolean(user),
      optedIn: viewer?.showOnLeaderboard === true,
      today: rankToday(games, user?.id ?? null),
      allTime: rankAllTime(users, user?.id ?? null),
    };
  } catch (error) {
    // A database hiccup should cost the boards, not the whole page.
    console.error("Error getting leaderboard:", error);
    return {
      date,
      signedIn: Boolean(user),
      optedIn: false,
      today: [],
      allTime: [],
    };
  }
};
