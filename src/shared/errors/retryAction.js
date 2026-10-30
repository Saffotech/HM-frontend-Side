/** Runs one retry at a time. A busy or missing action does not start another request. */
export async function runRetry(isBusy, action) {
  if (isBusy || typeof action !== 'function') {
    return { started: false, ok: false, value: null };
  }
  try {
    const value = await action();
    return { started: true, ok: true, value };
  } catch (error) {
    return { started: true, ok: false, value: null, error };
  }
}
