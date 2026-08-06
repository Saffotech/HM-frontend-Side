import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Scrolls to location.hash after route/hash changes (SPA-safe).
 * Retries briefly so lazy-loaded sections can mount first.
 */
export function useScrollToHash() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (!hash) return undefined;

    const id = hash.replace(/^#/, '');
    if (!id) return undefined;

    let cancelled = false;
    let attempts = 0;

    const tryScroll = () => {
      if (cancelled) return;
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      attempts += 1;
      if (attempts < 20) {
        window.setTimeout(tryScroll, 50);
      }
    };

    // Allow layout/nav sticky offset to settle
    const timer = window.setTimeout(tryScroll, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [pathname, hash]);
}
