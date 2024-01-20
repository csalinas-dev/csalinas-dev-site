import { useContext, useEffect } from "react";
import { Context, dismissError } from "../context";

export const useError = () => {
  const {
    state: { error },
    dispatch,
  } = useContext(Context);

  useEffect(() => {
    if (error) {
      setTimeout(() => dispatch(dismissError()), 1500);
    }
  }, [dispatch, error]);

  return error;
};
