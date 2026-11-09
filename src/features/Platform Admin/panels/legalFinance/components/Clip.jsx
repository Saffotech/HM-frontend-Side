import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

/** Single-line text that ellipsizes and shows the full value when it is cut off. */
export default function Clip({ children, className = "", as: Tag = "span", passive = false, ...rest }) {
  const value = children == null ? "" : String(children);
  const ref = useRef(null);
  const pinned = useRef(false);
  const [tip, setTip] = useState(null);
  const tipId = useId();
  const skipPin = passive || Tag === "a" || Tag === "button";

  const place = (el) => {
    if (!el || el.scrollWidth <= el.clientWidth + 1) {
      if (!pinned.current) setTip(null);
      return false;
    }
    const rect = el.getBoundingClientRect();
    const width = Math.min(360, Math.max(rect.width, 160));
    let left = rect.left;
    if (left + width > window.innerWidth - 12) left = Math.max(8, window.innerWidth - width - 12);
    let top = rect.bottom + 6;
    if (top + 72 > window.innerHeight) top = Math.max(8, rect.top - 8 - 72);
    setTip({ top, left, width });
    return true;
  };

  const hide = () => {
    pinned.current = false;
    setTip(null);
  };

  useEffect(() => {
    if (!tip) return undefined;
    const close = () => hide();
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [tip]);

  return (
    <Tag
      {...rest}
      ref={ref}
      className={`lf-clip${className ? ` ${className}` : ""}`}
      tabIndex={skipPin ? rest.tabIndex : 0}
      aria-describedby={tip ? tipId : undefined}
      onMouseEnter={(e) => {
        rest.onMouseEnter?.(e);
        place(e.currentTarget);
      }}
      onMouseLeave={(e) => {
        rest.onMouseLeave?.(e);
        if (!pinned.current) setTip(null);
      }}
      onFocus={(e) => {
        rest.onFocus?.(e);
        place(e.currentTarget);
      }}
      onBlur={(e) => {
        rest.onBlur?.(e);
        hide();
      }}
      onClick={(e) => {
        rest.onClick?.(e);
        if (skipPin) return;
        const shown = place(e.currentTarget);
        pinned.current = shown && !pinned.current ? true : false;
        if (!pinned.current) setTip(null);
      }}
      onKeyDown={(e) => {
        rest.onKeyDown?.(e);
        if (e.key === "Escape") hide();
      }}
    >
      {value}
      {tip && ref.current?.closest(".lf-panel")
        ? createPortal(
          <span id={tipId} role="tooltip" className="lf-tip" style={tip}>{value}</span>,
          ref.current.closest(".lf-panel"),
        )
        : null}
    </Tag>
  );
}
