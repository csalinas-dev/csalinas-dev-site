import dynamic from "next/dynamic";
const Game = dynamic(() => import("./Game"), { ssr: false });

import { ContextProvider } from "./context";

export const metadata = {
  title: "Hashtag | Christopher Salinas Jr.",
};

export const Hashtag = () => (
  <ContextProvider>
    <Game />
  </ContextProvider>
);

export default Hashtag;
