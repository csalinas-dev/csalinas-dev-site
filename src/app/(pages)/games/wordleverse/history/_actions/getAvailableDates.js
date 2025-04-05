"use server";

import { getCurrentUser } from "@/lib/auth";
import { getAvailableDatesFromDB } from "../_lib/storage/database";

/**
 * Server action to get available dates for the user
 * This is a wrapper around the database storage function
 * @returns {Array} Array of available dates with their status
 */
export async function getAvailableDates() {
  const user = await getCurrentUser();
  if (!user) {
    return [];
  }
  
  return getAvailableDatesFromDB(user.id);
}
