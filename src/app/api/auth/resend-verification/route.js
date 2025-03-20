import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
import nodemailer from "nodemailer";

const prisma = new PrismaClient();

// Function to send verification email
async function sendVerificationEmail(email, token) {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_SERVER_HOST,
    port: process.env.EMAIL_SERVER_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_SERVER_USER,
      pass: process.env.EMAIL_SERVER_PASSWORD,
    },
  });

  const verificationUrl = `${process.env.NEXTAUTH_URL}/api/auth/verify?token=${token}`;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: "Verify your email address",
    text: `Please verify your email address by clicking the following link: ${verificationUrl}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Verify your email address</h2>
        <p>Thank you for registering! Please verify your email address by clicking the button below:</p>
        <a href="${verificationUrl}" style="display: inline-block; background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 20px 0;">
          Verify Email
        </a>
        <p>If the button doesn't work, you can also click this link:</p>
        <a href="${verificationUrl}">${verificationUrl}</a>
        <p>This link will expire in 24 hours.</p>
      </div>
    `,
  });
}

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Find the user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Check if email is already verified
    if (user.emailVerified) {
      return NextResponse.json(
        { error: "Email is already verified" },
        { status: 400 }
      );
    }

    // Delete any existing verification tokens for this user
    await prisma.verificationToken.deleteMany({
      where: { identifier: email },
    });

    // Create a new verification token
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token,
        expires,
      },
    });

    // Send verification email
    await sendVerificationEmail(email, token);

    // Return success response
    return NextResponse.json(
      { message: "Verification email sent successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Resend verification error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to resend verification email" },
      { status: 500 }
    );
  }
}