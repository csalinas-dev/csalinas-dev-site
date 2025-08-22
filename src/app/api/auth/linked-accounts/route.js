import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    // Get the current session
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Find the user by email since the ID might not be set correctly
    const email = session.user.email;
    if (!email) {
      return NextResponse.json(
        { error: "User email not found in session" },
        { status: 400 }
      );
    }

    // Find the user with their linked accounts
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        accounts: {
          select: {
            id: true,
            provider: true,
            providerAccountId: true,
            createdAt: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Return the accounts
    return NextResponse.json(
      { accounts: user.accounts },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching linked accounts:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch linked accounts" },
      { status: 500 }
    );
  }
}