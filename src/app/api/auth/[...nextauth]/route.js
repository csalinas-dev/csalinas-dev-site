import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import GoogleProvider from "next-auth/providers/google";
import GithubProvider from "next-auth/providers/github";
import EmailProvider from "next-auth/providers/email";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import crypto from 'crypto';
import nodemailer from 'nodemailer';

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
    subject: 'Verify your email address',
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

export const handler = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    }),
    EmailProvider({
      server: {
        host: process.env.EMAIL_SERVER_HOST,
        port: process.env.EMAIL_SERVER_PORT,
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
      },
      from: process.env.EMAIL_FROM,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          // Find the user by email
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
          });

          // If user doesn't exist or password doesn't match
          if (!user || !user.password) {
            return null;
          }

          // Verify password
          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          );

          if (!isPasswordValid) {
            return null;
          }

          // Check if email is verified
          if (!user.emailVerified) {
            return null;
          }

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
          };
        } catch (error) {
          console.error("Error in authorize:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async session({ session, user, token }) {
      if (session.user) {
        if (user) {
          session.user.id = user.id;
        } else if (token) {
          session.user.id = token.sub;
        }
      }
      return session;
    },
    async signIn({ user, account, credentials }) {
      // Allow OAuth providers to sign in without email verification
      if (account?.provider === "google" || account?.provider === "github") {
        return true;
      }

      // For credentials provider, check if email is verified
      if (account?.provider === "credentials" && credentials) {
        const dbUser = await prisma.user.findUnique({
          where: { email: credentials.email },
        });
        
        if (dbUser && !dbUser.emailVerified) {
          // Create a new verification token
          const token = crypto.randomBytes(32).toString('hex');
          const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

          // Delete any existing tokens
          await prisma.verificationToken.deleteMany({
            where: { identifier: credentials.email },
          });

          // Create a new token
          await prisma.verificationToken.create({
            data: {
              identifier: credentials.email,
              token,
              expires,
            },
          });

          // Send verification email
          await sendVerificationEmail(credentials.email, token);
          
          return `/auth/signin?error=EMAIL_NOT_VERIFIED&email=${encodeURIComponent(credentials.email)}`;
        }
      }
      
      // For email provider, check if email is verified
      if (user?.email && !account) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email },
        });
        
        if (dbUser && !dbUser.emailVerified) {
          // Create a new verification token
          const token = crypto.randomBytes(32).toString('hex');
          const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

          // Delete any existing tokens
          await prisma.verificationToken.deleteMany({
            where: { identifier: user.email },
          });

          // Create a new token
          await prisma.verificationToken.create({
            data: {
              identifier: user.email,
              token,
              expires,
            },
          });

          // Send verification email
          await sendVerificationEmail(user.email, token);
          
          return `/auth/signin?error=EMAIL_NOT_VERIFIED&email=${encodeURIComponent(user.email)}`;
        }
      }
      
      return true;
    },
  },
  pages: {
    signIn: "/auth/signin",
    signOut: "/auth/signout",
    error: "/auth/error",
    verifyRequest: "/auth/verify-request",
    newUser: "/auth/register",
  },
  session: {
    strategy: "jwt",
  },
});

export { handler as GET, handler as POST };