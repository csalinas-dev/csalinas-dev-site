export const dismissAlert = () => ({
  type: "DISMISS ALERT",
});

export const dismissError = () => ({
  type: "DISMISS ERROR",
});

export const dragging = (tile) => ({
  type: "DRAGGING",
  tile,
});

export const playAgain = () => ({
  type: "PLAY AGAIN",
});

export const swapTiles = (tile) => ({
  type: "SWAP TILES",
  tile,
});
