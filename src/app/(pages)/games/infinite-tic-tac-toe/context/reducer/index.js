import { placeMark } from "./placeMark";
import { playAgain } from "./playAgain";

const reducer = (state, action) => {
  switch (action.type) {
    case "PLACE MARK":
      return placeMark(state, action.cell);
    case "PLAY AGAIN":
      return playAgain();
    default:
      return state;
  }
};

export default reducer;
