/**
 * Send an action, and give a lost revision race exactly one more go.
 *
 * A 409 means somebody else's action landed between the render this one was
 * aimed at and the request that carried it. `send` has already applied the
 * state we missed, so the same intent is worth precisely one retry against the
 * board that actually exists — and only one, because a second failure means the
 * conflict is real (that edge is genuinely taken, the game genuinely started)
 * rather than a crossing in flight.
 *
 * @param {Function} send - `useRoom`'s send
 * @param {Object} action - The action to send
 * @param {Object} [options] - Passed through to `send` (e.g. `{ optimistic }`)
 * @returns {Promise<Object>} The final result
 */
export const sendRetrying = async (send, action, options) => {
  const result = await send(action, options);
  if (result.ok || result.error !== "stale-revision") return result;
  return send(action, options);
};
