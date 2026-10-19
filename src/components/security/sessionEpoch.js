/**
 * Monotonic session generation. In-flight hospital requests capture the epoch
 * when they start and must not write tokens or cache data after it changes.
 */

let epoch = 0;
let logoutTask = null;

export function currentSessionEpoch() {
  return epoch;
}

export function beginNewSessionEpoch() {
  epoch += 1;
  return epoch;
}

export function isSessionCurrent(epochAtStart) {
  return epochAtStart === epoch;
}

export function getLogoutTask() {
  return logoutTask;
}

export function setLogoutTask(task) {
  logoutTask = task;
}
