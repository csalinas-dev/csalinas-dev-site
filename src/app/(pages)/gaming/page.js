import { Gaming } from "./Gaming";

// /games is what you can play here; /gaming is my record in the games I play
// elsewhere. Two different questions, so two different sections.
export const metadata = {
  title: "Gaming | Christopher Salinas Jr.",
  description:
    "Stats from the games I play elsewhere — scores, challenges and completion, read out of my own save files rather than a leaderboard.",
  keywords: ["gaming stats", "game stats", "Mini Motorways stats"],
  openGraph: {
    title: "Gaming",
    description: "Stats from the games I play elsewhere.",
    type: "website",
  },
};

export default Gaming;
