// Turning the preview off doesn't change the rules — the same mark still
// expires on the next move. Players just have to remember which one it is.
export const setExpiryPreview = (state, enabled) => ({
  ...state,
  showExpiring: enabled,
});
