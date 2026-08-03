import { ContextProvider } from "./context";
import Game from "./Game";

export const metadata = {
  title: "Infinite Tic-Tac-Toe | Christopher Salinas Jr.",
  description:
    "Two-player tic-tac-toe where each side keeps only three marks — every fourth move clears the oldest one.",
};

export const InfiniteTicTacToe = () => (
  <ContextProvider>
    <Game />
  </ContextProvider>
);

export default InfiniteTicTacToe;
