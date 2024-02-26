export const dragging = (tile) => ({
  type: "DRAGGING",
  tile,
});

export const swapTiles = (tile) => ({
  type: "SWAP TILES",
  tile,
});

export const dismissAlert = () => ({
  type: "DISMISS ALERT",
});

export const dismissError = () => ({
  type: "DISMISS ERROR",
});
