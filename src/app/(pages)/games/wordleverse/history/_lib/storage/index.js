"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";

import { getHistoryFromDB  } from "./database";
import { getHistoryFromLocalStorage } from "./localStorage";

/**
 * Custom hook to get user's game history
 * @param {Object} options - Options for fetching history
 * @returns {Object} The history data and loading state
 */
export const useHistory = (options = {}) => {
  const { data: session, status } = useSession();
  const [history, setHistory] = useState({
    games: [],
    streak: 0,
    maxStreak: 0,
    guessCounts: [0, 0, 0, 0, 0, 0],
  });
  const [availableDates, setAvailableDates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);

      if (status === "loading") {
        return;
      }

      if (session) {
        // Fetch history from database for authenticated users
        try {
          const data = await getHistoryFromDB({ includeAvailableDates: true });
          if (!data.error) {
            setHistory({
              games: data.games || [],
              streak: data.streak || 0,
              maxStreak: data.maxStreak || 0,
              guessCounts: data.guessCounts || [0, 0, 0, 0, 0, 0],
            });
            setAvailableDates(data.availableDates || []);
          } else {
            console.error("Failed to fetch history");
          }
        } catch (error) {
          console.error("Error fetching history:", error);
        }
      } else {
        // Use localStorage for non-authenticated users
        const localData = getHistoryFromLocalStorage({ includeAvailableDates: true });
        setHistory({
          games: localData.games,
          streak: localData.streak,
          maxStreak: localData.maxStreak,
          guessCounts: localData.guessCounts || [0, 0, 0, 0, 0, 0],
        });
        setAvailableDates(localData.availableDates);
      }

      setLoading(false);
    };

    fetchHistory();
  }, [session, status]);

  return { history, availableDates, loading };
};
