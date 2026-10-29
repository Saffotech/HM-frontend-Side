import { useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";
import { recordInAppVisit } from "./useInAppHistory";

function signatureFor(location, navigationType) {
  return `${navigationType}\n${location.key}\n${location.pathname}\n${location.search}\n${location.hash}`;
}

/** Records each in-app visit before child pages render, so Back can see the real previous page. */
export function InAppHistoryTracker({ children }) {
  const location = useLocation();
  const navigationType = useNavigationType();
  const recorded = useRef("");
  const signature = signatureFor(location, navigationType);
  if (recorded.current !== signature) {
    recorded.current = signature;
    recordInAppVisit(location, navigationType);
  }
  return children;
}
