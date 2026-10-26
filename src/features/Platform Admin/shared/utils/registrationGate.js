/** Submit stays blocked until a platform access token exists and no request is running. */
export function canSubmitRegistration({ signedIn, busy }) {
  return signedIn === true && busy !== true;
}
