"use client";

import { useSession } from "next-auth/react";

import { useHistory } from "./_lib/storage";

import Layout from "./_components/Layout";
import SignInPrompt from "./_components/SignInPrompt";
import Stats from "./_components/Stats";
import Calendar from "./_components/Calendar";

export default function HistoryPage() {
  const { data: session } = useSession();
  const { history, availableDates, loading } = useHistory();

  if (loading) {
    return (
      <Layout>
        <div>Loading history...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      {!session && <SignInPrompt />}
      <Stats history={history} />
      <Calendar availableDates={availableDates} games={history.games} />
    </Layout>
  );
}
