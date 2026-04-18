"use client";

import { useState, useEffect } from "react";
import { migrateGames } from "../_storage";

/**
 * Migrates localStorage games to the database when the user logs in.
 * Returns a boolean indicating whether migration is complete.
 * The game loader waits for migration to finish before fetching from DB
 * so the user doesn't see an empty board while migration is in flight.
 */
export const useMigrateLocalStorage = (session, status) => {
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (status === "loading") return;

    if (!session) {
      // Not authenticated — no migration needed
      setDone(true);
      return;
    }

    // Authenticated: clear any stale completion state, then migrate
    setDone(false);
    migrateGames(session).finally(() => setDone(true));
  }, [session, status]);

  return done;
};
