import { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';

export default function NurseHistoryFilter({
  label,
  items = [],
  value,
  onChange,
  getItemId,
  getItemDate,
  formatDate,
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  const activeId = (() => {
    if (value && items.some((item) => getItemId(item) === value)) return value;
    return items[0] ? getItemId(items[0]) : '';
  })();

  const selectedItem = items.find((item) => getItemId(item) === activeId) || items[0];

  useEffect(() => {
    if (!open) return undefined;
    const handleClickOutside = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  useEffect(() => {
    if (!value && activeId && onChange) onChange(activeId);
  }, [value, activeId, onChange]);

  if (!items.length) {
    return (
      <div className="nurse-history-filter">
        <span className="nurse-vital-detail__info-label">{label}</span>
        <span className="nurse-vital-detail__info-value">—</span>
      </div>
    );
  }

  return (
    <div className="nurse-history-filter" ref={rootRef}>
      <span className="nurse-vital-detail__info-label">{label}</span>
      <button
        type="button"
        className="nurse-history-filter__trigger"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="nurse-history-filter__value">
          {selectedItem ? formatDate(getItemDate(selectedItem)) : '—'}
        </span>
        <ChevronDown size={16} className={`nurse-history-filter__chevron${open ? ' nurse-history-filter__chevron--open' : ''}`} />
      </button>
      {open && (
        <ul className="nurse-history-filter__menu" role="listbox">
          {items.map((item) => {
            const id = getItemId(item);
            const isActive = id === activeId;
            return (
              <li key={id} role="option" aria-selected={isActive}>
                <button
                  type="button"
                  className={`nurse-history-filter__option${isActive ? ' nurse-history-filter__option--active' : ''}`}
                  onClick={() => {
                    onChange(id);
                    setOpen(false);
                  }}
                >
                  {formatDate(getItemDate(item))}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
