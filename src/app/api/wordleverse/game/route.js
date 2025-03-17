import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getOrCreateGame, saveGameState } from "@/lib/wordleverse-db";
import { getTodaysRandomWord } from "@/app/(pages)/games/wordleverse/context/random";

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
    const word = getTodaysRandomWord();
    const game = await getOrCreateGame(session.user.id, word);
    
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
    const gameState = await request.json();
    const updatedGame = await saveGameState(session.user.id, gameState);
    
    return NextResponse.json(updatedGame);
  } catch (error) {
    console.error("Error saving game:", error);
    return NextResponse.json({ error: "Failed to save game" }, { status: 500 });
  }
}