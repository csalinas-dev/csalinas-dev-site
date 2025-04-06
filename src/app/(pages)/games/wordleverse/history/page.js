"use client";

import { useSession } from "next-auth/react";

import Calendar from "./_components/Calendar";
import Layout from "./_components/Layout";
import SignInPrompt from "./_components/SignInPrompt";
import Stats from "./_components/Stats";
import { useHistory } from "./_lib/storage";

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
      <Stats history={history} historyPage={true} showHistoryLink={false} />
      <Calendar availableDates={availableDates} games={history.games} />
    </Layout>
  );
}
