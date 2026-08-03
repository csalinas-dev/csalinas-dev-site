export const placeMark = (cell) => ({
  type: "PLACE MARK",
  cell,
});

export const playAgain = () => ({
  type: "PLAY AGAIN",
});

export const setExpiryPreview = (enabled) => ({
  type: "SET EXPIRY PREVIEW",
  enabled,
});
