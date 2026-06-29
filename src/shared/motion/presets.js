/** Reusable Framer Motion presets — HMS enterprise UI */

export const EASE_STANDARD = [0.25, 0.1, 0.25, 1];

export const DURATION = {
  fast: 0.2,
  normal: 0.28,
  slow: 0.35,
};

/** Keep opacity at 1 — starting at 0 can leave a blank page if animation does not run (some Edge builds). */
export const pageTransition = {
  initial: { opacity: 1, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 1, y: 4 },
  transition: { duration: DURATION.normal, ease: EASE_STANDARD },
};

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: DURATION.fast, ease: EASE_STANDARD },
};

export const modalOverlay = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: DURATION.fast, ease: EASE_STANDARD },
};

export const modalPanel = {
  initial: { opacity: 0, scale: 0.97, y: 10 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.98, y: 6 },
  transition: { duration: DURATION.normal, ease: EASE_STANDARD },
};

export const toastItem = {
  initial: { opacity: 0, x: 24, scale: 0.98 },
  animate: { opacity: 1, x: 0, scale: 1 },
  exit: { opacity: 0, x: 16, scale: 0.98 },
  transition: { duration: DURATION.normal, ease: EASE_STANDARD },
};

export const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.04,
    },
  },
};

export const staggerItem = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.normal, ease: EASE_STANDARD },
  },
};

/** Returns motion props respecting reduced-motion preference */
export function motionProps(preset, reducedMotion) {
  if (reducedMotion) {
    return {
      initial: false,
      animate: false,
      exit: false,
      transition: { duration: 0 },
    };
  }
  return preset;
}
