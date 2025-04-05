"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

import { useHistory, getGameDetails } from "./_lib/storage";

import Layout from "./_components/Layout";
import SignInPrompt from "./_components/SignInPrompt";
import Stats from "./_components/Stats";
import Calendar from "./_components/Calendar";
import GameDetails from "./_components/GameDetails";

export default function HistoryPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { history, availableDates, loading } = useHistory();
  const [selectedGame, setSelectedGame] = useState(null);

  const handleDayClick = async (date, dateInfo) => {
    if (!dateInfo || (!dateInfo.played && !dateInfo.isToday)) return;

    // If it's a completed game, show details
    if (dateInfo.completed) {
      const game = history.games.find((g) => g.date === date);
      if (game) {
        await handleGameClick(game);
      }
    } else {
      // Otherwise, play this date's game
      playGame(date);
    }
  };

  const handleGameClick = async (game) => {
    setSelectedGame(game);

    // If authenticated, fetch the full game details
    if (session && game) {
      try {
        const gameData = await getGameDetails(game.date, true);
        if (!gameData.error) {
          setSelectedGame({
            ...game,
            board: gameData.board,
            guesses: gameData.guesses,
          });
        }
      } catch (error) {
        console.error("Error fetching game details:", error);
      }
    } else if (game) {
      // For non-authenticated users, get details from localStorage
      const gameData = getGameDetails(game.date, false);
      if (!gameData.error) {
        setSelectedGame({
          ...game,
          board: gameData.board,
          guesses: gameData.guesses,
        });
      }
    }
  };

  const playGame = (date) => {
    // Redirect to the game page with the date parameter
    router.push(`/games/wordleverse?date=${date}`);
  };

  const closeGameDetails = () => {
    setSelectedGame(null);
  };

  if (loading) {
    return (
      <Layout>
        <div>Loading history...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      {!session && <SignInPrompt />}
      
      <Stats history={history} />
      
      <Calendar 
        availableDates={availableDates} 
        games={history.games} 
        onDayClick={handleDayClick} 
      />
      
      {selectedGame && (
        <GameDetails 
          game={selectedGame} 
          onClose={closeGameDetails} 
          onPlay={playGame} 
        />
      )}
    </Layout>
  );
}
