import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function getFocusableElements(container) {
  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
    (el) => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true'
  );
}

export default function NurseConfirmDialog({
  open,
  title,
  subtitle,
  description,
  onConfirm,
  onCancel,
  confirmLabel = 'Confirm',
  variant = 'default',
  className = '',
}) {
  const dialogRef = useRef(null);
  const previousFocusRef = useRef(null);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && open) onCancel();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onCancel]);

  useEffect(() => {
    if (!open) return undefined;

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
  }, [open]);

  if (!open) return null;

  return (
    <div className="nurse-confirm-overlay" onClick={onCancel}>
      <div
        ref={dialogRef}
        className={`nurse-confirm ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        {(title || subtitle) && (
          <div className="nurse-confirm__header">
            <div className="nurse-confirm__header-text">
              {subtitle && <p className="nurse-confirm__subtitle">{subtitle}</p>}
              {title && <h3 className="nurse-confirm__title">{title}</h3>}
            </div>
            <button
              type="button"
              className="nurse-confirm__close"
              onClick={onCancel}
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        )}
        {description && (
          <div className="nurse-confirm__body">
            {typeof description === 'string' ? <p>{description}</p> : description}
          </div>
        )}
        <div className="nurse-confirm__actions">
          <button type="button" className="nurse-btn nurse-btn--secondary" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className={`nurse-btn ${variant === 'danger' ? 'nurse-btn--danger' : 'nurse-btn--primary'}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
