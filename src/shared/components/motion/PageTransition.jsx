import { useEffect } from 'react';
import { motion, useReducedMotion, useAnimation } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { pageTransition } from '@/shared/motion';

/**
 * Route-level fade + upward motion. Wrap page content once per view.
 */
export default function PageTransition({ children, className = 'page-transition' }) {
  const { pathname } = useLocation();
  const reducedMotion = useReducedMotion();
  const controls = useAnimation();

  useEffect(() => {
    if (reducedMotion) return undefined;
    controls.set(pageTransition.initial);
    const animation = controls.start(pageTransition.animate);
    return () => {
      controls.stop();
      void animation;
    };
  }, [pathname, controls, reducedMotion]);

  if (reducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={pageTransition.initial}
      animate={controls}
      exit={pageTransition.exit}
      transition={pageTransition.transition}
    >
      {children}
    </motion.div>
  );
}
