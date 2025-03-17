import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserGameHistory } from "@/lib/wordleverse-db";

// GET /api/wordleverse/history
export async function GET(request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const history = await getUserGameHistory(session.user.id);
    return NextResponse.json(history);
  } catch (error) {
    console.error("Error getting history:", error);
    return NextResponse.json({ error: "Failed to get history" }, { status: 500 });
  }
}