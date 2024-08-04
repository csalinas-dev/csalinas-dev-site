import dynamic from "next/dynamic";
const Game = dynamic(() => import("./Game"), { ssr: false });

import { ContextProvider } from "./context";

export const metadata = {
  title: "Wordleverse | Christopher Salinas Jr.",
};

export const Wordleverse = () => (
  <ContextProvider>
    <Game />
  </ContextProvider>
);

export default Wordleverse;
