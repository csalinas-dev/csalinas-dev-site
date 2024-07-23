export const toggleExpert = (state) => {
  var newState = {
    ...state,
    expert: !state.expert,
  };

  localStorage.setItem("expert", newState.expert);

  return newState;
};
