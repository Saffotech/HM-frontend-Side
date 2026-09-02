import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check, ChevronDown } from 'lucide-react';
import { DURATION, EASE_STANDARD } from '@/shared/motion';

export default function PricingFilterMenu({ label, value, options, onChange, ariaLabel }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const reduceMotion = useReducedMotion();
  const selected = options.find((opt) => opt.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="pricing-filter-menu" ref={rootRef}>
      {label ? <span className="pricing-filter-menu__label">{label}</span> : null}
      <div className="pricing-filter-menu__field">
        <button
          type="button"
          className={`pricing-filter-menu__trigger${open ? ' is-open' : ''}`}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={ariaLabel || label}
          onClick={() => setOpen((prev) => !prev)}
        >
          <span className="pricing-filter-menu__value">{selected?.label}</span>
          <ChevronDown size={16} aria-hidden="true" />
        </button>
        <AnimatePresence>
          {open ? (
            <motion.ul
              className="pricing-filter-menu__list"
              role="listbox"
              aria-label={ariaLabel || label}
              initial={reduceMotion ? false : { opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: DURATION.fast, ease: EASE_STANDARD }}
            >
              {options.map((opt) => {
                const active = opt.value === value;
                return (
                  <li key={opt.value} role="none">
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      className={`pricing-filter-menu__option${
                        active ? ' is-active' : ''
                      }`}
                      onClick={() => {
                        onChange(opt.value);
                        setOpen(false);
                      }}
                    >
                      <span>{opt.label}</span>
                      {active ? <Check size={15} aria-hidden="true" /> : null}
                    </button>
                  </li>
                );
              })}
            </motion.ul>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
