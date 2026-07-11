/**
 * In-memory user state management.
 * States do NOT survive bot restarts — UX must handle this gracefully.
 */

/** @type {Map<number, {step: string, data: object, updatedAt: number}>} */
export const userStates = new Map();

/** Set of submission IDs currently being processed (race condition guard) */
export const processingSubmissions = new Set();

/** Set of deposit IDs currently being processed */
export const processingDeposits = new Set();

export function setState(userId, step, data = {}) {
  userStates.set(userId, { step, data, updatedAt: Date.now() });
}

export function getState(userId) {
  return userStates.get(userId) || null;
}

export function clearState(userId) {
  userStates.delete(userId);
}

export function updateStateData(userId, partialData) {
  const current = getState(userId);
  if (current) {
    userStates.set(userId, {
      ...current,
      data: { ...current.data, ...partialData },
      updatedAt: Date.now(),
    });
  }
}

/**
 * Remove states older than maxAgeMs (default 30 minutes)
 */
export function cleanupStaleStates(maxAgeMs = 30 * 60 * 1000) {
  const now = Date.now();
  let removed = 0;
  for (const [userId, state] of userStates.entries()) {
    if (now - state.updatedAt > maxAgeMs) {
      userStates.delete(userId);
      removed++;
    }
  }
  return removed;
}
