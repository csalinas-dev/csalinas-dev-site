"use client";

import { useEffect } from "react";

import { saveGame } from "@wordleverse/_actions/saveGame";
import { getRandomWord } from "@wordleverse/_lib/random";

export const useMigrateLocalStorage = (session, status) => {
  useEffect(() => {
    (async () => {
      // Only run migration if user is authenticated and not in loading state
      if (!session || status === "loading" || typeof window === "undefined") {
        return;
      }

      // Find all localStorage keys that start with WORDLEVERSE-
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("WORDLEVERSE-")) {
          keys.push(key);
        }
      }

      if (keys.length === 0) {
        return; // No games to migrate
      }

      console.log(
        `Found ${keys.length} games to migrate from localStorage to database`
      );

      // Migrate each game to the database
      for (const key of keys) {
        try {
          const date = key.replace("WORDLEVERSE-", "");
          const savedGame = localStorage.getItem(key);

          if (!savedGame) continue;

          const game = JSON.parse(savedGame);

          // Track guesses for history view
          const guesses = [];
          for (let i = 0; i < game.row; i++) {
            const rowGuess = game.board[i].map((cell) => cell.letter).join("");
            if (rowGuess.length === 5) {
              guesses.push(rowGuess);
            }
          }

          const gameState = {
            ...game,
            guesses,
            completed: game.win !== null || game.row > 5,
            word: getRandomWord(new Date(date)),
          };

          // Save to database
          await getOrCreateGame(session.user.id, date);
          const result = await saveGame({ gameState, date });

          if (!result.error) {
            // Clear from localStorage after successful migration
            localStorage.removeItem(key);
            console.log(`Successfully migrated game from ${date} to database`);
          } else {
            console.error(`Failed to migrate game from ${date} to database`);
          }
        } catch (error) {
          console.error("Error migrating game:", error);
        }
      }
    })();
  }, [session, status]);
};
