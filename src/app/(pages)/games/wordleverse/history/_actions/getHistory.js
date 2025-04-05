"use server";

import { getCurrentUser } from "@/lib/auth";
import { getHistoryFromDB } from "../_lib/storage/database";

/**
 * Server action to get user's game history
 * This is a wrapper around the database storage function
 * @param {Object} options - Options for fetching history
 * @returns {Object} The history data or error
 */
export const getHistory = async (options = {}) => {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "Unauthorized", status: 401 };
  }
  
  return await getHistoryFromDB(options);
};