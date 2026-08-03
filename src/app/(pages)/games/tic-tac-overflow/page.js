import { TicTacOverflow } from "./TicTacOverflow";

// The game is called Tic-Tac-Overflow here, but people looking for it search
// for the generic names — "infinite tic-tac-toe" and "continuous tic-tac-toe".
// Those stay in the description and keywords so the page is still findable.
export const metadata = {
  title: "Tic-Tac-Overflow — Infinite Tic-Tac-Toe | Christopher Salinas Jr.",
  description:
    "Play infinite tic-tac-toe (also called continuous tic-tac-toe) in your browser. Two players, three marks each — every fourth move clears that player's oldest mark, so the game never ends in a draw.",
  keywords: [
    "infinite tic-tac-toe",
    "continuous tic-tac-toe",
    "tic-tac-toe variant",
    "three mark tic-tac-toe",
    "tic tac toe game",
    "Tic-Tac-Overflow",
  ],
  openGraph: {
    title: "Tic-Tac-Overflow — Infinite Tic-Tac-Toe",
    description:
      "Infinite tic-tac-toe: each player keeps only three marks, so the oldest one vanishes as soon as a fourth is placed. No draws, ever.",
    type: "website",
  },
};

export default function Page() {
  return <TicTacOverflow />;
}
