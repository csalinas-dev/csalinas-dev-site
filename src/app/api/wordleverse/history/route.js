import { NextResponse } from "next/server";
import { getSession } from "@/app/auth";
import { getUserGameHistory, getAvailableDates } from "@/lib/wordleverse-db";

// GET /api/wordleverse/history
export async function GET(request) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const includeAvailableDates = searchParams.get("includeDates") === "true";
    
    // Get user's game history with streak information
    const history = await getUserGameHistory(session.user.id);
    
    // If requested, include available dates
    if (includeAvailableDates) {
      const availableDates = await getAvailableDates(session.user.id);
      return NextResponse.json({
        ...history,
        availableDates
      });
    }
    
    return NextResponse.json(history);
  } catch (error) {
    console.error("Error getting history:", error);
    return NextResponse.json({ error: "Failed to get history" }, { status: 500 });
  }
}