import { getServerSession } from "next-auth";
import { handler } from "@/app/api/auth/[...nextauth]/route";

export const getSession = async () => {
  return await getServerSession(handler);
};

export const getCurrentUser = async () => {
  const session = await getSession();
  return session?.user;
};