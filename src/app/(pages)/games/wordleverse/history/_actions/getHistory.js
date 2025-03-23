"use server";

import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

import { getAvailableDates } from "./getAvailableDates";

export const getHistory = async (options = {}) => {
   const user = await getCurrentUser();
    if (!user) {
      return { error: "Unauthorized", status: 401 };
    }
    const userId = user.id;
  
    try {
      // Get user's game history with streak information
      const games = await prisma.wordleHistory.findMany({
        where: {
          userId,
        },
        orderBy: {
          date: "desc",
        },
      });
    
      // Get user's streak information
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { streak: true, maxStreak: true },
      });

      const history = {
        games,
        streak: user?.streak || 0,
        maxStreak: user?.maxStreak || 0,
      }

      // If requested, include available dates
      const includeAvailableDates = options.includeAvailableDates === true;
      if (includeAvailableDates) {
        const availableDates = await getAvailableDates(userId);
        return {
          ...history,
          availableDates
        };
      }
      
      return history;
    } catch (error) {
      console.error("Error getting history:", error);
      return { error: "Failed to get history", status: 500 };
    }
}