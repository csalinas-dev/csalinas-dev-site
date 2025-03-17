"use client";

import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function SignOut() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const handleSignOut = async () => {
      try {
        await signOut({ redirect: false });
        router.push("/");
        router.refresh();
      } catch (error) {
        console.error("Error signing out:", error);
      } finally {
        setIsLoading(false);
      }
    };

    handleSignOut();
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 text-center">
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight">
          {isLoading ? "Signing out..." : "You have been signed out"}
        </h2>
        {!isLoading && (
          <p className="mt-2 text-center text-sm text-gray-600">
            You will be redirected to the home page shortly.
          </p>
        )}
      </div>
    </div>
  );
}