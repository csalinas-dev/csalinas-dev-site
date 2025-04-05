"use client";

import dateFormat from "dateformat";
import { cloneDeep } from "lodash";
import { useEffect } from "react";

import { getEligibleWords } from "../_context/reducer/helpers";
import { defaultState } from "../_lib/defaults";
import { getRandomWord } from "../_lib/random";
import { getGame, getExpertMode } from "../_storage";

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

      // Initialize base state
      const state = cloneDeep(defaultState);
      state.word = getRandomWord(gameDate);
      state.gameDate = gameDate;
      state.isPastGame = gameDate !== today;
      state.expert = getExpertMode();

      if (status === "loading") {
        return;
      }

      // Try to load game from appropriate storage
      try {
        const gameData = await getGame(gameDate, session, status);

        if (gameData) {
          const newState = {
            ...state,
            ...gameData,
            gameDate,
          };
          newState.wordsRemaining = getEligibleWords(newState);
          setInitialState(newState);
          setIsLoading(false);
          return;
        }
      } catch (error) {
        console.error("Error loading game:", error);
      }

      // If no game was found, use the default state
      setInitialState(state);
      setIsLoading(false);
    })();
  }, [session, status, date, setInitialState, setIsLoading]);
};
