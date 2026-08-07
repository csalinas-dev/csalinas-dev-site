import SignInPrompt from "@wordleverse-history/_components/SignInPrompt";

import Layout from "./_components/Layout";
import LeaderboardTabs from "./_components/LeaderboardTabs";
import OptInToggle from "./_components/OptInToggle";
import { getLeaderboard } from "./_lib/leaderboard";

// Load-bearing. The Docker image runs `next build` *before* the deploy runs
// `prisma db push`, so a statically prerendered page would query a
// `showOnLeaderboard` column that does not exist yet and fail the build.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Wordleverse Leaderboard | Christopher Salinas Jr.",
};

export default async function LeaderboardPage() {
  const data = await getLeaderboard();

  return (
    <Layout>
      {data.signedIn ? (
        <OptInToggle optedIn={data.optedIn} />
      ) : (
        <SignInPrompt />
      )}
      <LeaderboardTabs {...data} />
    </Layout>
  );
}
