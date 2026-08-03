import { ContextProvider } from "./context";
import Game from "./Game";

// "Edge Case" is the name; "dots and boxes" is what people search for. Both
// stay in the description and keywords so the page is findable either way.
export const metadata = {
  title: "Edge Case — Dots and Boxes | Christopher Salinas Jr.",
  description:
    "Claim the edge. Close the case. Play dots and boxes in your browser — two to four players on one device, on a 5, 7 or 9 dot grid. Close a box and you go again.",
  keywords: [
    "dots and boxes",
    "dots and boxes online",
    "dots and boxes 2 player",
    "pen and paper game",
    "Edge Case",
  ],
  openGraph: {
    title: "Edge Case — Dots and Boxes",
    description:
      "Claim the edge. Close the case. Two to four players, one device, and the rule that makes the game: close a box and you go again.",
    type: "website",
  },
};

export const EdgeCase = () => (
  <ContextProvider>
    <Game />
  </ContextProvider>
);

export default EdgeCase;
