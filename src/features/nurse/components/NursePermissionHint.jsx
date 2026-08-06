import { useCallback, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Action control that stays visible when permission is off:
 * gray disabled look + tooltip above the button (hover or click).
 */
export default function NursePermissionHint({
  message = 'You do not have permission',
  show = false,
  children,
}) {
  const wrapRef = useRef(null);
  const tipId = useId();
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const closeTimer = useRef(null);

  const updatePosition = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setCoords({
      top: rect.top - 8,
      left: rect.left + rect.width / 2,
    });
  }, []);

  const clearCloseTimer = useCallback(() => {
    if (closeTimer.current) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const openTip = useCallback(() => {
    clearCloseTimer();
    updatePosition();
    setOpen(true);
  }, [clearCloseTimer, updatePosition]);

  const closeTip = useCallback(() => {
    clearCloseTimer();
    setOpen(false);
  }, [clearCloseTimer]);

  const closeTipSoon = useCallback(() => {
    clearCloseTimer();
    closeTimer.current = window.setTimeout(() => setOpen(false), 120);
  }, [clearCloseTimer]);

  useLayoutEffect(() => {
    if (!open) return undefined;
    const onScrollOrResize = () => updatePosition();
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [open, updatePosition]);

  useLayoutEffect(() => () => clearCloseTimer(), [clearCloseTimer]);

  if (!show) return children;

  return (
    <span
      ref={wrapRef}
      className="nurse-permission-hint"
      onMouseEnter={openTip}
      onMouseLeave={closeTipSoon}
      onFocus={openTip}
      onBlur={closeTipSoon}
      onClick={(e) => {
        e.stopPropagation();
        openTip();
      }}
      aria-describedby={open ? tipId : undefined}
    >
      {children}
      {open
        ? createPortal(
            <span
              id={tipId}
              role="tooltip"
              className="nurse-permission-hint__tooltip"
              style={{ top: coords.top, left: coords.left }}
            >
              {message}
            </span>,
            document.body,
          )
        : null}
    </span>
  );
}
