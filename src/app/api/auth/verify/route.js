import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request) {
  try {
    // Get token from URL
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.redirect(new URL("/auth/error?error=MissingToken", request.url));
    }

    // Find the verification token
    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token },
    });

    if (!verificationToken) {
      return NextResponse.redirect(new URL("/auth/error?error=InvalidToken", request.url));
    }

    // Check if token is expired
    if (new Date() > new Date(verificationToken.expires)) {
      await prisma.verificationToken.delete({
        where: { token },
      });
      return NextResponse.redirect(new URL("/auth/error?error=TokenExpired", request.url));
    }

    // Find the user by email
    const user = await prisma.user.findUnique({
      where: { email: verificationToken.identifier },
    });

    if (!user) {
      return NextResponse.redirect(new URL("/auth/error?error=UserNotFound", request.url));
    }

    // Update user's emailVerified field
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: new Date() },
    });

    // Delete the verification token
    await prisma.verificationToken.delete({
      where: { token },
    });

    // Redirect to success page
    return NextResponse.redirect(new URL("/auth/signin?verified=true", request.url));
  } catch (error) {
    console.error("Email verification error:", error);
    return NextResponse.redirect(new URL("/auth/error?error=VerificationFailed", request.url));
  }
}