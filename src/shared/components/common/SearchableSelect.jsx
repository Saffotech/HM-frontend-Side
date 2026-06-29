import { useState, useRef, useEffect, useCallback, memo, useId } from 'react';
import { createPortal } from 'react-dom';
import { Search, ChevronDown } from 'lucide-react';
import { highlightMatch } from '@/shared/utils/highlightMatch';
import './SearchableSelect.css';

const DROPDOWN_GAP_PX = 4;
const DROPDOWN_MIN_HEIGHT_PX = 120;
const DROPDOWN_MAX_HEIGHT_FALLBACK_PX = 256;

function readDropdownMaxHeightPx() {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue('--dropdown-max-height')
    .trim();
  if (!raw) return DROPDOWN_MAX_HEIGHT_FALLBACK_PX;
  if (raw.endsWith('rem')) {
    const rem = parseFloat(raw);
    const rootPx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    return rem * rootPx;
  }
  const px = parseFloat(raw);
  return Number.isFinite(px) && px > 0 ? px : DROPDOWN_MAX_HEIGHT_FALLBACK_PX;
}

function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Search...',
  disabled = false,
  className = '',
  label,
  error,
  clearOnEmptyBlur = false,
  onSearchChange,
}) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(0);
  const containerRef = useRef(null);
  const inputWrapRef = useRef(null);
  const listRef = useRef(null);
  const [dropdownStyle, setDropdownStyle] = useState(null);
  const [opensUp, setOpensUp] = useState(false);
  const inputId = useId();
  const errorId = `${inputId}-error`;

  const selected = options.find((o) => o.value === value);

  const filtered = options.filter(
    (o) =>
      o.label.toLowerCase().includes(search.toLowerCase()) ||
      o.sublabel?.toLowerCase().includes(search.toLowerCase()) ||
      o.badge?.toLowerCase().includes(search.toLowerCase()) ||
      o.searchText?.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    if (!open) {
      setSearch(selected ? selected.label : '');
    }
  }, [value, selected, open]);

  useEffect(() => {
    setHighlightIdx(0);
  }, [search, open]);

  useEffect(() => {
    onSearchChange?.(search);
  }, [search, onSearchChange]);

  const updateDropdownPosition = useCallback(() => {
    const wrap = inputWrapRef.current;
    if (!wrap) return;

    const rect = wrap.getBoundingClientRect();
    const preferredMax = readDropdownMaxHeightPx();

    const spaceBelow = window.innerHeight - rect.bottom - DROPDOWN_GAP_PX;
    const spaceAbove = rect.top - DROPDOWN_GAP_PX;
    const openUp = spaceBelow < DROPDOWN_MIN_HEIGHT_PX && spaceAbove > spaceBelow;
    setOpensUp(openUp);
    const available = openUp ? spaceAbove : spaceBelow;
    const maxHeight = Math.max(
      DROPDOWN_MIN_HEIGHT_PX,
      Math.min(preferredMax, available - DROPDOWN_GAP_PX)
    );

    setDropdownStyle({
      position: 'fixed',
      left: rect.left,
      width: rect.width,
      maxHeight,
      ...(openUp
        ? { bottom: window.innerHeight - rect.top + DROPDOWN_GAP_PX }
        : { top: rect.bottom + DROPDOWN_GAP_PX }),
    });
  }, []);

  useEffect(() => {
    if (!open) {
      setDropdownStyle(null);
      return undefined;
    }

    updateDropdownPosition();
    window.addEventListener('resize', updateDropdownPosition);
    window.addEventListener('scroll', updateDropdownPosition, true);
    return () => {
      window.removeEventListener('resize', updateDropdownPosition);
      window.removeEventListener('scroll', updateDropdownPosition, true);
    };
  }, [open, updateDropdownPosition, filtered.length]);

  useEffect(() => {
    const handleOutside = (e) => {
      const inField = containerRef.current?.contains(e.target);
      const inList = listRef.current?.contains(e.target);
      if (!inField && !inList) {
        if (clearOnEmptyBlur && selected && search.trim() === '') {
          onChange('');
        }
        setOpen(false);
        setSearch(selected ? selected.label : '');
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [selected, search, clearOnEmptyBlur, onChange]);

  const openDropdown = useCallback(() => {
    if (disabled || open) return;
    const selectedIdx = value ? options.findIndex((o) => o.value === value) : 0;
    setOpen(true);
    setSearch('');
    setHighlightIdx(selectedIdx >= 0 ? selectedIdx : 0);
  }, [disabled, open, value, options]);

  const selectOption = useCallback(
    (option) => {
      onChange(option.value);
      setSearch(option.label);
      setOpen(false);
    },
    [onChange]
  );

  const handleKeyDown = (e) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        const selectedIdx = value ? options.findIndex((o) => o.value === value) : 0;
        setOpen(true);
        setSearch('');
        setHighlightIdx(selectedIdx >= 0 ? selectedIdx : 0);
        e.preventDefault();
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIdx((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && filtered[highlightIdx]) {
      e.preventDefault();
      selectOption(filtered[highlightIdx]);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setSearch(selected ? selected.label : '');
    }
  };

  useEffect(() => {
    const el = listRef.current?.children[highlightIdx];
    el?.scrollIntoView({ block: 'nearest' });
  }, [highlightIdx]);

  return (
    <div ref={containerRef} className={`searchable-select ${className}`}>
      {label && (
        <label htmlFor={inputId} className="searchable-select__label">
          {label}
        </label>
      )}
      <div className="searchable-select__input-wrap" ref={inputWrapRef}>
        <Search className="searchable-select__icon" size={15} aria-hidden />
        <input
          id={inputId}
          className="searchable-select__input"
          placeholder={placeholder}
          value={open ? search : selected ? selected.label : ''}
          disabled={disabled}
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          onKeyDown={handleKeyDown}
          onChange={(e) => {
            const next = e.target.value;
            setSearch(next);
            setOpen(true);
            if (clearOnEmptyBlur && value && next.trim() === '') {
              onChange('');
            }
          }}
          onFocus={openDropdown}
          onClick={openDropdown}
        />
        <button
          type="button"
          className="searchable-select__chevron-btn"
          tabIndex={-1}
          aria-label="Toggle options"
          disabled={disabled}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (open) {
              setOpen(false);
            } else {
              openDropdown();
            }
          }}
        >
          <ChevronDown
            className={`searchable-select__chevron ${open ? 'searchable-select__chevron--open' : ''}`}
            size={16}
            aria-hidden
          />
        </button>
      </div>

      {open &&
        !disabled &&
        dropdownStyle &&
        createPortal(
          <div
            className={`searchable-select__dropdown searchable-select__dropdown--portal scrollable-dropdown${opensUp ? ' searchable-select__dropdown--up' : ''}`}
            ref={listRef}
            role="listbox"
            style={dropdownStyle}
          >
            {filtered.length === 0 ? (
              <div className="searchable-select__empty">
                <Search size={14} />
                <span>No results for &quot;{search}&quot;</span>
              </div>
            ) : (
              filtered.map((option, idx) => (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={option.value === value}
                  className={`searchable-select__option ${
                    option.value === value ? 'searchable-select__option--active' : ''
                  } ${idx === highlightIdx ? 'searchable-select__option--highlight' : ''}`}
                  onMouseEnter={() => setHighlightIdx(idx)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selectOption(option);
                  }}
                >
                  <div className="searchable-select__option-text">
                    <div className="searchable-select__option-label">
                      {highlightMatch(option.label, search)}
                    </div>
                    {option.sublabel && (
                      <div className="searchable-select__option-sub">
                        {highlightMatch(option.sublabel, search)}
                      </div>
                    )}
                  </div>
                  {option.badge && (
                    <span className="searchable-select__badge">
                      {highlightMatch(option.badge, search)}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>,
          document.body
        )}
      {error && (
        <span id={errorId} className="field__error">
          {error}
        </span>
      )}
    </div>
  );
}

export default memo(SearchableSelect);
