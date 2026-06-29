import { useEffect, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { modalOverlay, modalPanel } from '@/shared/motion';
import './Modal.css';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function getFocusableElements(container) {
  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
    (el) => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true'
  );
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  panelClassName = '',
  overlayClassName = '',
}) {
  const reducedMotion = useReducedMotion();
  const dialogRef = useRef(null);
  const previousFocusRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const container = dialogRef.current;
    if (!container) return undefined;

    previousFocusRef.current = document.activeElement;

    const focusFirst = () => {
      const focusable = getFocusableElements(container);
      if (focusable.length > 0) {
        focusable[0].focus();
      } else {
        container.setAttribute('tabindex', '-1');
        container.focus();
      }
    };

    const focusFrame = requestAnimationFrame(focusFirst);

    const onKeyDown = (e) => {
      if (e.key !== 'Tab') return;

      const focusable = getFocusableElements(container);
      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (!container.contains(document.activeElement)) {
        e.preventDefault();
        first.focus();
        return;
      }

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);

    return () => {
      cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', onKeyDown);
      const previous = previousFocusRef.current;
      if (previous && typeof previous.focus === 'function' && document.contains(previous)) {
        previous.focus();
      }
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={`modal-overlay${overlayClassName ? ` ${overlayClassName}` : ''}`}
          onClick={onClose}
          role="presentation"
          initial={reducedMotion ? false : modalOverlay.initial}
          animate={reducedMotion ? false : modalOverlay.animate}
          exit={reducedMotion ? false : modalOverlay.exit}
          transition={modalOverlay.transition}
        >
          <motion.div
            ref={dialogRef}
            className={`modal modal--${size} ${panelClassName}`.trim()}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            initial={reducedMotion ? false : modalPanel.initial}
            animate={reducedMotion ? false : modalPanel.animate}
            exit={reducedMotion ? false : modalPanel.exit}
            transition={modalPanel.transition}
          >
            {title && (
              <header className="modal__header">
                <h2 className="modal__title">{title}</h2>
                <button type="button" className="modal__close" onClick={onClose} aria-label="Close">
                  ×
                </button>
              </header>
            )}
            <div className="modal__body">{children}</div>
            {footer && <footer className="modal__footer">{footer}</footer>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
