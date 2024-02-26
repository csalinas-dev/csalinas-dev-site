import { dismissAlert } from "./dismissAlert";
import { dismissError } from "./dismissError";
import { dragging } from "./dragging";
import { swapTiles } from "./swapTiles";

const reducer = (state, action) => {
  switch (action.type) {
    case "DRAGGING":
      return dragging(state, action.tile);
    case "SWAP TILES":
      return swapTiles(state, action.tile);
    case "DISMISS ALERT":
      return dismissAlert(state);
    case "DISMISS ERROR":
      return dismissError(state);
    default:
      return state;
  }
};

export default reducer;
