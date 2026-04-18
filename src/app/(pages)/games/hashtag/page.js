import { ContextProvider } from "./context";
import GameLoader from "./GameLoader";

export const metadata = {
  title: "Hashtag | Christopher Salinas Jr.",
};

export const Hashtag = () => (
  <ContextProvider>
    <GameLoader />
  </ContextProvider>
);

export default Hashtag;
