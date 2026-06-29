import { useState, useEffect } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { subscribeToast } from '@/shared/utils/toast';
import { toastItem } from '@/shared/motion';
import './Toast.css';

function ToastMessage({ toast, reducedMotion }) {
  const className = `toast toast--${toast.type}`;

  if (reducedMotion) {
    return (
      <div className={className} role="status">
        {toast.message}
      </div>
    );
  }

  return (
    <motion.div
      className={className}
      role="status"
      initial={toastItem.initial}
      animate={toastItem.animate}
      exit={toastItem.exit}
      transition={toastItem.transition}
    >
      {toast.message}
    </motion.div>
  );
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    return subscribeToast((toast) => {
      if (toast.dismiss) {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
      } else {
        setToasts((prev) => [...prev, toast]);
      }
    });
  }, []);

  return (
    <div className="toast-container" aria-live="polite" aria-atomic="false">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <ToastMessage key={t.id} toast={t} reducedMotion={reducedMotion} />
        ))}
      </AnimatePresence>
    </div>
  );
}
