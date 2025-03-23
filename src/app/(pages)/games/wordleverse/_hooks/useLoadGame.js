"use client";

import dateFormat from "dateformat";
import { cloneDeep } from "lodash";
import { useEffect } from "react";

import { getOrCreateGame } from "@wordleverse/_actions/getOrCreateGame";
import { getEligibleWords } from "@wordleverse/_context/reducer/helpers";
import { defaultState } from "@wordleverse/_lib/defaults";
import { getRandomWord } from "@wordleverse/_lib/random";
import { convertStatus } from "@wordleverse/_lib/Status";

export const useLoadGame = (
  date,
  session,
  status,
  setInitialState,
  setIsLoading
) => {
  useEffect(() => {
    (async () => {
      setIsLoading(true);
      const today = dateFormat(new Date(), "yyyy-mm-dd");
      const gameDate = date || today;

      const state = cloneDeep(defaultState);
      state.word = getRandomWord(gameDate);
      state.gameDate = gameDate;
      state.isPastGame = gameDate !== today;

      if (status === "loading") {
        return;
      }

      if (session) {
        // Use database for authenticated users
        try {
          const gameData = await getOrCreateGame(gameDate);

          if (!gameData.error && gameData) {
            // Convert database statuses to enum values
            gameData.board = gameData.board.map((row) =>
              row.map((cell) => ({
                ...cell,
                status: convertStatus(cell.status),
              }))
            );

            gameData.keyboard = gameData.keyboard.map((key) => ({
              ...key,
              status: convertStatus(key.status),
            }));

            const newState = {
              ...state,
              ...gameData,
              gameDate,
              isPastGame,
            };
            newState.wordsRemaining = getEligibleWords(newState);
            setInitialState(newState);
            setIsLoading(false);
            return;
          }

          // continue to localStorage
        } catch (error) {
          console.error("Error loading game:", error);
          // continue to localStorage
        }
      }

      // Use localStorage for non-authenticated users
      if (typeof window !== "undefined") {
        state.expert = localStorage.getItem("expert") === "true";
        const saved = localStorage.getItem(`WORDLEVERSE-${gameDate}`);
        if (saved) {
          const game = JSON.parse(saved);
          const newState = {
            ...state,
            ...game,
          };
          newState.wordsRemaining = getEligibleWords(newState);
          setInitialState(newState);
          setIsLoading(false);
          return;
        }
      }

      setInitialState(state);
      setIsLoading(false);
    })();
  }, [session, status, date, setInitialState, setIsLoading]);
};
