import { Children } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { staggerContainer, staggerItem } from '@/shared/motion';

/**
 * Staggered reveal for dashboard sections / stat grids.
 * @param {{ children: import('react').ReactNode, className?: string, as?: keyof typeof motion }} props
 */
export default function StaggerReveal({ children, className = '', as = 'div' }) {
  const reducedMotion = useReducedMotion();
  const MotionTag = motion[as] || motion.div;

  if (reducedMotion) {
    const Tag = as;
    return <Tag className={className}>{children}</Tag>;
  }

  return (
    <MotionTag
      className={className}
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {Children.map(children, (child, index) =>
        child != null ? (
          <motion.div key={child.key ?? index} variants={staggerItem}>
            {child}
          </motion.div>
        ) : null
      )}
    </MotionTag>
  );
}
