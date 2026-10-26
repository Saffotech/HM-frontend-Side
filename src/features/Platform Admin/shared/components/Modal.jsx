import { useEffect, useId, useRef } from "react";
import {
  canRestoreFocus,
  focusableElements,
  isTopModal,
  lockPageScroll,
  nextFocusTarget,
  popModal,
  pushModal,
} from "./modalFocus";
import "./Modal.css";

export default function Modal({ open, title, subtitle, onClose, children, footer, size = "md" }) {
  const dialogRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const restoreRef = useRef(null);
  const titleId = useId();
  const modalId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return undefined;
    restoreRef.current = typeof document !== "undefined" ? document.activeElement : null;
    pushModal(modalId);
    const releaseScroll = lockPageScroll(document.body);
    dialogRef.current?.focus();

    const onKey = (event) => {
      if (!isTopModal(modalId)) return;
      if (event.key === "Escape") {
        event.stopPropagation();
        onCloseRef.current?.();
        return;
      }
      if (event.key !== "Tab") return;
      const root = dialogRef.current;
      if (!root) return;
      event.preventDefault();
      const items = focusableElements(root);
      if (!items.length) {
        root.focus();
        return;
      }
      nextFocusTarget(items, document.activeElement, event.shiftKey)?.focus();
    };

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      popModal(modalId);
      releaseScroll();
      const previous = restoreRef.current;
      restoreRef.current = null;
      if (canRestoreFocus(previous)) previous.focus();
    };
  }, [open, modalId]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div
        className={`modal modal-${size}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        ref={dialogRef}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <div>
            <h2 id={titleId}>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close dialog">×</button>
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer className="modal-footer">{footer}</footer>}
      </div>
    </div>
  );
}
