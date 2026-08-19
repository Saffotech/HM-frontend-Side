import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * IPD back navigation:
 * prefer browser history so users return to the actual prior page,
 * but fall back to a safe IPD route on direct entry / refresh.
 */
export default function useIpdBackNavigation(fallbackTo) {
  const navigate = useNavigate();

  return useCallback(() => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate(fallbackTo, { replace: true });
  }, [fallbackTo, navigate]);
}
