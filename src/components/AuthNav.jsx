"use client";

import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";

export default function AuthNav() {
  const { data: session, status } = useSession();
  const isLoading = status === "loading";

  return (
    <div className="flex items-center space-x-4">
      {isLoading ? (
        <span className="text-sm">Loading...</span>
      ) : session ? (
        <>
          <span className="text-sm">
            Signed in as {session.user?.name || session.user?.email}
          </span>
          <button
            onClick={() => signOut()}
            className="rounded-md bg-gray-800 px-3 py-1.5 text-sm font-semibold text-white hover:bg-gray-700"
          >
            Sign out
          </button>
        </>
      ) : (
        <button
          onClick={() => signIn()}
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500"
        >
          Sign in
        </button>
      )}
    </div>
  );
}