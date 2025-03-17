import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getOrCreateGame, saveGameState, getGameByDate } from "@/lib/wordleverse-db";
import { getTodaysRandomWord } from "@/app/(pages)/games/wordleverse/context/random";
import dateFormat from "dateformat";

// Helper function to get word for a specific date
function getWordForDate(date) {
  // This is a simplified implementation
  // In a real app, you would have a deterministic way to get the word for any date
  // For now, we'll just use the current random word generator
  return getTodaysRandomWord();
}

// GET /api/wordleverse/game
export async function GET(request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");

  if (!date) {
    return NextResponse.json({ error: "Date parameter is required" }, { status: 400 });
  }

  try {
    const today = dateFormat(new Date(), "yyyy-mm-dd");
    const isPastGame = date !== today;
    
    // Check if the game already exists
    let game = await getGameByDate(session.user.id, date);
    
    if (!game) {
      // If game doesn't exist, create a new one with the appropriate word
      const word = getWordForDate(date);
      game = await getOrCreateGame(session.user.id, word, date);
    }
    
    return NextResponse.json(game);
  } catch (error) {
    console.error("Error getting game:", error);
    return NextResponse.json({ error: "Failed to get game" }, { status: 500 });
  }
}

// POST /api/wordleverse/game
export async function POST(request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await request.json();
    const { gameState, date } = data;
    
    const updatedGame = await saveGameState(session.user.id, gameState, date);
    
    return NextResponse.json(updatedGame);
  } catch (error) {
    console.error("Error saving game:", error);
    return NextResponse.json({ error: "Failed to save game" }, { status: 500 });
  }
}