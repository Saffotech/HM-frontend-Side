import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Route-level upward motion. Opacity stays at 1 so a missed animation cannot blank the page.
 * CSS keeps this off the framer-motion chunk, which is only needed by screens that animate dialogs.
 */
export default function PageTransition({ children, className = 'page-transition' }) {
  const { pathname } = useLocation();
  const frameRef = useRef(null);

  useEffect(() => {
    const node = frameRef.current;
    if (!node) return undefined;
    node.classList.remove('page-transition--enter');
    const frame = requestAnimationFrame(() => {
      node.classList.add('page-transition--enter');
    });
    return () => cancelAnimationFrame(frame);
  }, [pathname]);

  return (
    <div ref={frameRef} className={className}>
      {children}
    </div>
  );
}
