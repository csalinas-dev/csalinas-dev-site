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

    const { accountId } = await request.json();

    if (!accountId) {
      return NextResponse.json(
        { error: "Account ID is required" },
        { status: 400 }
      );
    }

    // Find the user with their linked accounts
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        accounts: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Check if the account belongs to the user
    const account = user.accounts.find(acc => acc.id === accountId);
    
    if (!account) {
      return NextResponse.json(
        { error: "Account not found or does not belong to the user" },
        { status: 404 }
      );
    }

    // Prevent unlinking the last account
    if (user.accounts.length === 1) {
      return NextResponse.json(
        { error: "Cannot unlink the last authentication method" },
        { status: 400 }
      );
    }

    // Delete the account
    await prisma.account.delete({
      where: { id: accountId },
    });

    // Return success response
    return NextResponse.json(
      { message: "Account unlinked successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error unlinking account:", error);
    return NextResponse.json(
      { error: error.message || "Failed to unlink account" },
      { status: 500 }
    );
  }
}