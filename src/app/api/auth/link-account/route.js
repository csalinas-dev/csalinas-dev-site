import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(request) {
  try {
    // Get the current session
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get user email from session
    const email = session.user.email;
    if (!email) {
      return NextResponse.json(
        { error: "User email not found in session" },
        { status: 400 }
      );
    }

    const { provider, providerAccountId, accessToken, refreshToken, expiresAt } = await request.json();

    // Validate input
    if (!provider || !providerAccountId) {
      return NextResponse.json(
        { error: "Provider and providerAccountId are required" },
        { status: 400 }
      );
    }

    // Find the user
    const user = await prisma.user.findUnique({
      where: { email },
      include: { accounts: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Check if this provider account is already linked to this user
    const existingAccount = user.accounts.find(
      (acc) => acc.provider === provider && acc.providerAccountId === providerAccountId
    );

    if (existingAccount) {
      return NextResponse.json(
        { message: "Account already linked" },
        { status: 200 }
      );
    }

    // Check if this provider account is linked to another user
    const linkedToOtherUser = await prisma.account.findFirst({
      where: {
        provider,
        providerAccountId,
        NOT: {
          userId: user.id,
        },
      },
    });

    if (linkedToOtherUser) {
      return NextResponse.json(
        { error: "This provider account is already linked to another user" },
        { status: 400 }
      );
    }

    // Create the account link
    await prisma.account.create({
      data: {
        userId: user.id,
        type: "oauth",
        provider,
        providerAccountId,
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: expiresAt ? Math.floor(expiresAt / 1000) : null,
      },
    });

    // Return success response
    return NextResponse.json(
      { message: "Account linked successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Account linking error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to link account" },
      { status: 500 }
    );
  }
}