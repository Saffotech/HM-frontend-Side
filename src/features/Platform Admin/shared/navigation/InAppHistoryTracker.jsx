import { useRef } from "react";
import { useLocation, useNavigate, useNavigationType } from "react-router-dom";
import { createInAppHistory } from "./inAppHistory";

const sharedHistory = createInAppHistory();

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
    sharedHistory.record(location, navigationType);
  }
  return children;
}

export function useInAppPrevious(belongs) {
  useLocation();
  useNavigationType();
  return sharedHistory.previousWithin(belongs);
}

/**
 * Return to the previous page in this panel.
 * A direct visit, refresh, or cross-panel entry uses the fallback instead of leaving the app.
 * The fallback replaces the current entry so Back cannot bounce between the same two URLs.
 */
export function useInAppBack(fallback, belongs, { historyBack = false } = {}) {
  const navigate = useNavigate();
  const location = useLocation();
  const navigationType = useNavigationType();

  return () => {
    sharedHistory.record(location, navigationType);
    const previous = sharedHistory.previousWithin(belongs);
    if (previous || historyBack) {
      navigate(-1);
      return;
    }
    const target = typeof fallback === "function" ? fallback() : fallback;
    const here = `${location.pathname}${location.search}`;
    if (!target || target === here || target === location.pathname) return;
    navigate(target, { replace: true });
  };
}
