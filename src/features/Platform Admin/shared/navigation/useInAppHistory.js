import { useLocation, useNavigate, useNavigationType } from "react-router-dom";
import { createInAppHistory } from "./inAppHistory";

const sharedHistory = createInAppHistory();

export function recordInAppVisit(location, navigationType) {
  sharedHistory.record(location, navigationType);
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
