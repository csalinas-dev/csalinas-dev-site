import { dismissAlert } from "./dismissAlert";
import { dismissError } from "./dismissError";
import { dragging } from "./dragging";
import { playAgain } from "./playAgain";
import { swapTiles } from "./swapTiles";

const reducer = (state, action) => {
  switch (action.type) {
    case "DRAGGING":
      return dragging(state, action.tile);
    case "SWAP TILES":
      return swapTiles(state, action.tile);
    case "PLAY AGAIN":
      return playAgain();
    case "DISMISS ALERT":
      return dismissAlert(state);
    case "DISMISS ERROR":
      return dismissError(state);
    default:
      return state;
  }
};

export default reducer;
