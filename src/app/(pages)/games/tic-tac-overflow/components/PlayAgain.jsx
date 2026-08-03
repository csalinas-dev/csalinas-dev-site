import { useContext } from "react";

import { Context, playAgain } from "../context";
import { Button } from "./Button";

export const PlayAgain = () => {
  const {
    state: { winner },
    dispatch,
    canReset,
  } = useContext(Context);

  // Hotseat this is "anything has happened yet"; online it is "somebody has
  // won", because a shared board is not one player's to wipe mid-game.
  return (
    <Button
      disabled={!canReset}
      onClick={() => dispatch(playAgain())}
      type="button"
    >
      <span>
        <i className="fa-solid fa-rotate-left" />
      </span>{" "}
      {winner === null ? "Reset board" : "Play again!"}
    </Button>
  );
};
