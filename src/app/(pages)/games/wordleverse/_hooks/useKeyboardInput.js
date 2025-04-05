import { useContext, useEffect } from "react";
import {
  Context,
  addLetter,
  removeLetter,
  submitGuess,
} from "@wordleverse/_context";

export const useKeyboardInput = () => {
  const {
    state: { win },
    dispatch,
  } = useContext(Context);
  useEffect(() => {
    const keydown = (event) => {
      if (win) {
        return;
      }
      if (event.key === "Enter") {
        dispatch(submitGuess());
      } else if (event.key === "Backspace") {
        dispatch(removeLetter());
      } else if (event.key.length === 1 && event.key.match(/[a-z]/i)) {
        dispatch(addLetter(event.key.toUpperCase()));
      }
    };

    document.addEventListener("keydown", keydown);

    return () => document.removeEventListener("keydown", keydown);
  }, [dispatch, win]);
};
