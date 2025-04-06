import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Add export config for static generation
export const dynamic = 'force-static';

// Generate static paths for verification tokens
export async function generateStaticParams() {
  return []; // Empty array as we can't predict verification tokens
}

export async function GET(request) {
  try {
    // Get token from URL - using a static approach
    const url = new URL(request.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return NextResponse.redirect(new URL("/auth/error?error=MissingToken", url.origin));
    }

    // Find the verification token
    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token },
    });

    if (!verificationToken) {
      return NextResponse.redirect(new URL("/auth/error?error=InvalidToken", url.origin));
    }

    // Check if token is expired
    if (new Date() > new Date(verificationToken.expires)) {
      await prisma.verificationToken.delete({
        where: { token },
      });
      return NextResponse.redirect(new URL("/auth/error?error=TokenExpired", url.origin));
    }

    // Find the user by email
    const user = await prisma.user.findUnique({
      where: { email: verificationToken.identifier },
    });

    if (!user) {
      return NextResponse.redirect(new URL("/auth/error?error=UserNotFound", url.origin));
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
    return NextResponse.redirect(new URL("/auth/signin?verified=true", url.origin));
  } catch (error) {
    console.error("Email verification error:", error);
    return NextResponse.redirect(new URL("/auth/error?error=VerificationFailed", url.origin));
  }
}