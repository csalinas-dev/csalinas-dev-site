"use client";

import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";

export default function AuthNav() {
  const { data: session, status } = useSession();
  const isLoading = status === "loading";

  // Simplified version for the navigation bar
  return (
    <>
      {isLoading ? (
        <span>Loading...</span>
      ) : session ? (
        <button
          onClick={() => signOut()}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          <i className="fa-solid fa-sign-out-alt" /> Sign out
        </button>
      ) : (
        <button
          onClick={() => signIn()}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          <i className="fa-solid fa-sign-in-alt" /> Sign in
        </button>
      )}
    </>
  );
}