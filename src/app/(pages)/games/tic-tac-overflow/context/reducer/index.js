import { placeMark } from "./placeMark";
import { playAgain } from "./playAgain";
import { setExpiryPreview } from "./setExpiryPreview";

const reducer = (state, action) => {
  switch (action.type) {
    case "PLACE MARK":
      return placeMark(state, action.cell);
    case "PLAY AGAIN":
      return playAgain(state);
    case "SET EXPIRY PREVIEW":
      return setExpiryPreview(state, action.enabled);
    default:
      return state;
  }
};

export default reducer;
