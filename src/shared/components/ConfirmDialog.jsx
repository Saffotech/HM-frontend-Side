import { useEffect } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { modalOverlay, modalPanel } from '@/shared/motion';
import './ConfirmDialog.css';

export default function ConfirmDialog({
  isOpen,
  message,
  title,
  confirmLabel = 'Confirm',
  onConfirm,
  onCancel,
}) {
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => e.key === 'Escape' && onCancel();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, onCancel]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="confirm-dialog-overlay"
          onClick={onCancel}
          role="presentation"
          initial={reducedMotion ? false : modalOverlay.initial}
          animate={reducedMotion ? false : modalOverlay.animate}
          exit={reducedMotion ? false : modalOverlay.exit}
          transition={modalOverlay.transition}
        >
          <motion.div
            className="confirm-dialog"
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-message"
            initial={reducedMotion ? false : modalPanel.initial}
            animate={reducedMotion ? false : modalPanel.animate}
            exit={reducedMotion ? false : modalPanel.exit}
            transition={modalPanel.transition}
          >
            {title ? (
              <h2 id="confirm-dialog-title" className="confirm-dialog__title">
                {title}
              </h2>
            ) : null}
            <p id="confirm-dialog-message" className="confirm-dialog__message">
              {message}
            </p>
            <div className="confirm-dialog__actions">
              <button type="button" className="confirm-dialog__cancel" onClick={onCancel}>
                Cancel
              </button>
              <button type="button" className="confirm-dialog__confirm" onClick={onConfirm}>
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
