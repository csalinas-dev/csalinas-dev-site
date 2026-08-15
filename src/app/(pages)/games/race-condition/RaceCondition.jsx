"use client";

import { ContextProvider } from "./context";
import Game from "./Game";

/**
 * Race Condition — the page.
 *
 * One screen for now: the hotseat game, two players and one device. Online play
 * and the mode picker in front of it are #144's, and they replace the body of
 * this component rather than anything under it — `Game` and the board already
 * take their state from a context that does not care who fills it.
 */
export const RaceCondition = () => (
  <ContextProvider>
    <Game />
  </ContextProvider>
);

export default RaceCondition;
