"use client";

import { useEffect } from "react";
import { migrateGames } from "../_storage";

export const useMigrateLocalStorage = (session, status) => {
  useEffect(() => {
    (async () => {
      // Only run migration if user is authenticated and not in loading state
      if (!session || status === "loading" || typeof window === "undefined") {
        return;
      }

      // Migrate games from localStorage to database
      await migrateGames(session);
    })();
  }, [session, status]);
};
