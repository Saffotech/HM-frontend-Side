import { useState, useRef, useEffect, useCallback, useId, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import './DateInput.css';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function parseYmd(value) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  if (
    date.getFullYear() !== y
    || date.getMonth() !== m - 1
    || date.getDate() !== d
  ) {
    return null;
  }
  return date;
}

function toYmd(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDisplay(ymd) {
  const date = parseYmd(ymd);
  if (!date) return '';
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function currentTimeHm() {
  const now = new Date();
  return `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
}

function parseDatetimeLocal(value) {
  if (!value) return { date: '', time: '' };
  const [date, timePart] = value.split('T');
  return {
    date: date || '',
    time: timePart ? timePart.slice(0, 5) : '',
  };
}

function toDatetimeLocal(date, time) {
  if (!date) return '';
  const hm = time && /^\d{2}:\d{2}$/.test(time) ? time : '00:00';
  return `${date}T${hm}`;
}

function formatDatetimeDisplay(value) {
  const { date, time } = parseDatetimeLocal(value);
  const d = formatDisplay(date);
  if (!d) return '';
  return time ? `${d} ${time}` : d;
}

/** Parse typed dd/mm/yyyy, dd-mm-yyyy, or yyyy-mm-dd → YYYY-MM-DD or null */
function parseTypedDate(raw) {
  const s = raw.trim();
  if (!s) return '';

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return parseYmd(s) ? s : null;
  }

  const match = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year
    || date.getMonth() !== month - 1
    || date.getDate() !== day
  ) {
    return null;
  }
  return toYmd(date);
}

/** Parse typed date/time → { date, time } or null */
function parseTypedDatetime(raw) {
  const s = raw.trim();
  if (!s) return { date: '', time: '' };

  const dtMatch = s.match(
    /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})\s*,?\s*(\d{1,2}):(\d{2})$/,
  );
  if (dtMatch) {
    const day = Number(dtMatch[1]);
    const month = Number(dtMatch[2]);
    const year = Number(dtMatch[3]);
    const hour = Number(dtMatch[4]);
    const minute = Number(dtMatch[5]);
    const date = new Date(year, month - 1, day);
    if (
      date.getFullYear() !== year
      || date.getMonth() !== month - 1
      || date.getDate() !== day
      || hour < 0
      || hour > 23
      || minute < 0
      || minute > 59
    ) {
      return null;
    }
    return { date: toYmd(date), time: `${pad2(hour)}:${pad2(minute)}` };
  }

  const dateOnly = parseTypedDate(s);
  if (dateOnly === null) return null;
  return { date: dateOnly, time: '' };
}

function isSameDay(a, b) {
  return (
    a
    && b
    && a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
  );
}

function buildCalendarDays(viewYear, viewMonth) {
  const first = new Date(viewYear, viewMonth, 1);
  const startOffset = first.getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrev = new Date(viewYear, viewMonth, 0).getDate();
  const cells = [];

  for (let i = startOffset - 1; i >= 0; i -= 1) {
    const day = daysInPrev - i;
    cells.push({ date: new Date(viewYear, viewMonth - 1, day), outside: true });
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ date: new Date(viewYear, viewMonth, day), outside: false });
  }
  let nextDay = 1;
  while (cells.length < 42) {
    cells.push({ date: new Date(viewYear, viewMonth + 1, nextDay), outside: true });
    nextDay += 1;
  }
  return cells;
}

function isBeforeDay(date, minYmd) {
  const min = parseYmd(minYmd);
  if (!min) return false;
  return date < new Date(min.getFullYear(), min.getMonth(), min.getDate());
}

function isAfterDay(date, maxYmd) {
  const max = parseYmd(maxYmd);
  if (!max) return false;
  return date > new Date(max.getFullYear(), max.getMonth(), max.getDate());
}

/** Visible year rows before scroll (~2009–2020 when list starts near 2009). */
const YEAR_LIST_VISIBLE_ROWS = 12;

function YearPickerSelect({ years, value, onChange }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const wrapRef = useRef(null);
  const selectedRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const handleOutside = (e) => {
      if (!wrapRef.current?.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    selectedRef.current?.scrollIntoView({ block: 'nearest' });
  }, [menuOpen, value]);

  return (
    <div ref={wrapRef} className="date-picker__year-wrap">
      <button
        type="button"
        className="date-picker__select date-picker__select--year date-picker__year-btn"
        aria-label="Select year"
        aria-expanded={menuOpen}
        aria-haspopup="listbox"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={() => setMenuOpen((open) => !open)}
      >
        {value}
      </button>
      {menuOpen && (
        <ul
          className="date-picker__year-list"
          role="listbox"
          aria-label="Year"
          style={{ maxHeight: `calc(1.375rem * ${YEAR_LIST_VISIBLE_ROWS})` }}
        >
          {years.map((year) => (
            <li key={year} role="presentation">
              <button
                type="button"
                ref={year === value ? selectedRef : undefined}
                role="option"
                aria-selected={year === value}
                className={[
                  'date-picker__year-option',
                  year === value ? 'date-picker__year-option--selected' : '',
                ].filter(Boolean).join(' ')}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => {
                  onChange(year);
                  setMenuOpen(false);
                }}
              >
                {year}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function DateInput({
  label,
  id,
  value = '',
  onChange,
  placeholder = 'DD/MM/YYYY',
  required = false,
  disabled = false,
  error,
  className = '',
  min,
  max,
  withTime = false,
  'aria-label': ariaLabel,
}) {
  const autoId = useId();
  const inputId =
    id || (typeof label === 'string' ? label.toLowerCase().replace(/\s/g, '-') : autoId);
  const errorId = `${inputId}-error`;

  const dateValue = withTime ? parseDatetimeLocal(value).date : value;
  const timeValue = withTime ? parseDatetimeLocal(value).time : '';
  const selected = parseYmd(dateValue);
  const today = useMemo(() => new Date(), []);
  const initialView = selected || today;
  const resolvedPlaceholder = withTime ? 'DD/MM/YYYY HH:mm' : placeholder;

  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(initialView.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialView.getMonth());
  const [popoverStyle, setPopoverStyle] = useState(null);
  const [textValue, setTextValue] = useState(() => {
    if (!value) return '';
    return withTime ? formatDatetimeDisplay(value) : formatDisplay(value);
  });
  const [pickerHour, setPickerHour] = useState(() => {
    const t = withTime ? parseDatetimeLocal(value).time : '';
    return t ? Number(t.split(':')[0]) : today.getHours();
  });
  const [pickerMinute, setPickerMinute] = useState(() => {
    const t = withTime ? parseDatetimeLocal(value).time : '';
    return t ? Number(t.split(':')[1]) : today.getMinutes();
  });

  const wrapRef = useRef(null);
  const popoverRef = useRef(null);
  const inputRef = useRef(null);
  const isTypingRef = useRef(false);

  const days = useMemo(
    () => buildCalendarDays(viewYear, viewMonth),
    [viewYear, viewMonth],
  );

  const yearOptions = useMemo(() => {
    const current = today.getFullYear();
    const minYear = min ? (parseYmd(min)?.getFullYear() ?? current - 80) : current - 80;
    const maxYear = max ? (parseYmd(max)?.getFullYear() ?? current + 10) : current + 10;
    const from = Math.min(minYear, maxYear);
    const to = Math.max(minYear, maxYear);
    const years = [];
    for (let y = from; y <= to; y += 1) {
      years.push(y);
    }
    return years;
  }, [min, max, today]);

  useEffect(() => {
    if (!isTypingRef.current) {
      if (!value) {
        setTextValue('');
        return;
      }
      setTextValue(withTime ? formatDatetimeDisplay(value) : formatDisplay(value));
      if (withTime) {
        const { time } = parseDatetimeLocal(value);
        if (time) {
          const [h, m] = time.split(':').map(Number);
          setPickerHour(h);
          setPickerMinute(m);
        }
      }
    }
  }, [value, withTime]);

  const updatePopoverPosition = useCallback(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    const popoverHeight = withTime ? 310 : 255;
    const spaceBelow = window.innerHeight - rect.bottom - 8;
    const openUp = spaceBelow < popoverHeight && rect.top > spaceBelow;

    setPopoverStyle({
      position: 'fixed',
      left: rect.left,
      width: 248,
      zIndex: 'var(--dropdown-z-index)',
      ...(openUp
        ? { bottom: window.innerHeight - rect.top + 6 }
        : { top: rect.bottom + 6 }),
    });
  }, [withTime]);

  useEffect(() => {
    if (!open) {
      setPopoverStyle(null);
      return undefined;
    }
    if (selected) {
      setViewYear(selected.getFullYear());
      setViewMonth(selected.getMonth());
    }
    updatePopoverPosition();
    window.addEventListener('resize', updatePopoverPosition);
    window.addEventListener('scroll', updatePopoverPosition, true);
    return () => {
      window.removeEventListener('resize', updatePopoverPosition);
      window.removeEventListener('scroll', updatePopoverPosition, true);
    };
  }, [open, selected, updatePopoverPosition]);

  useEffect(() => {
    if (!open) return undefined;
    const handleOutside = (e) => {
      const inField = wrapRef.current?.contains(e.target);
      const inPopover = popoverRef.current?.contains(e.target);
      if (!inField && !inPopover) setOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  const emitChange = useCallback(
    (next) => {
      onChange?.({ target: { value: next } });
    },
    [onChange],
  );

  const emitDatetime = useCallback(
    (date, time) => {
      const next = toDatetimeLocal(date, time);
      emitChange(next);
      setTextValue(next ? formatDatetimeDisplay(next) : '');
    },
    [emitChange],
  );

  const pickDate = useCallback(
    (date) => {
      if (isBeforeDay(date, min) || isAfterDay(date, max)) return;
      const ymd = toYmd(date);
      if (withTime) {
        const hm = `${pad2(pickerHour)}:${pad2(pickerMinute)}`;
        emitDatetime(ymd, hm);
        isTypingRef.current = false;
        return;
      }
      emitChange(ymd);
      setTextValue(formatDisplay(ymd));
      isTypingRef.current = false;
      setOpen(false);
    },
    [emitChange, emitDatetime, min, max, pickerHour, pickerMinute, withTime],
  );

  const applyPickerTime = useCallback(
    (hour, minute) => {
      const date = dateValue || toYmd(today);
      emitDatetime(date, `${pad2(hour)}:${pad2(minute)}`);
      isTypingRef.current = false;
    },
    [dateValue, emitDatetime, today],
  );

  const commitText = useCallback(() => {
    isTypingRef.current = false;
    const raw = textValue.trim();
    if (!raw) {
      if (value) emitChange('');
      setTextValue('');
      return;
    }
    if (withTime) {
      const parsed = parseTypedDatetime(raw);
      if (parsed === null) {
        setTextValue(value ? formatDatetimeDisplay(value) : '');
        return;
      }
      if (!parsed.date) {
        emitChange('');
        setTextValue('');
        return;
      }
      const date = parseYmd(parsed.date);
      if (!date || isBeforeDay(date, min) || isAfterDay(date, max)) {
        setTextValue(value ? formatDatetimeDisplay(value) : '');
        return;
      }
      const hm = parsed.time || timeValue || currentTimeHm();
      emitDatetime(parsed.date, hm);
      setTextValue(formatDatetimeDisplay(toDatetimeLocal(parsed.date, hm)));
      return;
    }

    const parsed = parseTypedDate(raw);
    if (parsed === null) {
      setTextValue(value ? formatDisplay(value) : '');
      return;
    }
    if (!parsed) {
      emitChange('');
      setTextValue('');
      return;
    }
    const date = parseYmd(parsed);
    if (!date || isBeforeDay(date, min) || isAfterDay(date, max)) {
      setTextValue(value ? formatDisplay(value) : '');
      return;
    }
    emitChange(parsed);
    setTextValue(formatDisplay(parsed));
  }, [textValue, value, emitChange, emitDatetime, min, max, withTime, timeValue]);

  const handleTextChange = (e) => {
    isTypingRef.current = true;
    setTextValue(e.target.value);
  };

  const handleTextFocus = () => {
    isTypingRef.current = true;
  };

  const handleTextBlur = () => {
    window.setTimeout(() => {
      const active = document.activeElement;
      if (wrapRef.current?.contains(active) || popoverRef.current?.contains(active)) {
        return;
      }
      commitText();
    }, 0);
  };

  const handleTextKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitText();
      setOpen(false);
      inputRef.current?.blur();
    } else if (e.key === 'Escape') {
      isTypingRef.current = false;
      setTextValue(value ? (withTime ? formatDatetimeDisplay(value) : formatDisplay(value)) : '');
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  const toggleCalendar = () => {
    if (disabled) return;
    setOpen((o) => !o);
    inputRef.current?.focus();
  };

  const goPrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const goNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleToday = () => {
    const ymd = toYmd(today);
    if (!isBeforeDay(today, min) && !isAfterDay(today, max)) {
      if (withTime) {
        const hm = currentTimeHm();
        const [h, m] = hm.split(':').map(Number);
        setPickerHour(h);
        setPickerMinute(m);
        emitDatetime(ymd, hm);
      } else {
        emitChange(ymd);
        setTextValue(formatDisplay(ymd));
      }
      isTypingRef.current = false;
      setOpen(false);
    }
  };

  const handleClear = () => {
    emitChange('');
    setTextValue('');
    isTypingRef.current = false;
    setOpen(false);
  };

  const hourOptions = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);
  const minuteOptions = useMemo(() => Array.from({ length: 60 }, (_, i) => i), []);

  return (
    <div className={`field date-input ${className}`}>
      {label && (
        <label htmlFor={inputId} className="field__label">
          {label}
        </label>
      )}
      <div
        ref={wrapRef}
        className={`date-input__wrap${dateValue ? ' date-input__wrap--filled' : ''}${error ? ' date-input__wrap--error' : ''}`}
      >
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          className="date-input__text"
          value={textValue}
          onChange={handleTextChange}
          onFocus={handleTextFocus}
          onBlur={handleTextBlur}
          onKeyDown={handleTextKeyDown}
          placeholder={resolvedPlaceholder}
          disabled={disabled}
          autoComplete="off"
          inputMode="numeric"
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          aria-label={ariaLabel || (typeof label === 'string' ? label : undefined)}
        />
        <button
          type="button"
          className="date-input__calendar-btn"
          disabled={disabled}
          aria-label="Open calendar"
          aria-expanded={open}
          onMouseDown={(e) => e.preventDefault()}
          onClick={toggleCalendar}
        >
          <CalendarDays size={16} aria-hidden />
        </button>
      </div>

      {open && !disabled && popoverStyle && createPortal(
        <div
          ref={popoverRef}
          className="date-picker"
          role="dialog"
          aria-label="Choose date"
          style={popoverStyle}
        >
          <div className="date-picker__head">
            <button type="button" className="date-picker__nav" onClick={goPrevMonth} aria-label="Previous month">
              <ChevronLeft size={15} />
            </button>
            <div className="date-picker__selects">
              <select
                className="date-picker__select"
                value={viewMonth}
                aria-label="Select month"
                onMouseDown={(e) => e.stopPropagation()}
                onChange={(e) => setViewMonth(Number(e.target.value))}
              >
                {MONTHS.map((name, index) => (
                  <option key={name} value={index}>
                    {name}
                  </option>
                ))}
              </select>
              <YearPickerSelect
                years={yearOptions}
                value={viewYear}
                onChange={setViewYear}
              />
            </div>
            <button type="button" className="date-picker__nav" onClick={goNextMonth} aria-label="Next month">
              <ChevronRight size={15} />
            </button>
          </div>

          <div className="date-picker__weekdays">
            {WEEKDAYS.map((day) => (
              <span key={day} className="date-picker__weekday">
                {day}
              </span>
            ))}
          </div>

          <div className="date-picker__grid">
            {days.map(({ date, outside }) => {
              const ymd = toYmd(date);
              const isSelected = isSameDay(date, selected);
              const isToday = isSameDay(date, today);
              const isDisabled = isBeforeDay(date, min) || isAfterDay(date, max);
              return (
                <button
                  key={`${ymd}-${outside ? 'o' : 'i'}`}
                  type="button"
                  className={[
                    'date-picker__day',
                    outside ? 'date-picker__day--outside' : '',
                    isSelected ? 'date-picker__day--selected' : '',
                    isToday ? 'date-picker__day--today' : '',
                  ].filter(Boolean).join(' ')}
                  disabled={isDisabled}
                  onClick={() => pickDate(date)}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          {withTime && (
            <div className="date-picker__time">
              <span className="date-picker__time-label">Time</span>
              <select
                className="date-picker__time-select"
                value={pickerHour}
                aria-label="Hour"
                onMouseDown={(e) => e.stopPropagation()}
                onChange={(e) => {
                  const hour = Number(e.target.value);
                  setPickerHour(hour);
                  applyPickerTime(hour, pickerMinute);
                }}
              >
                {hourOptions.map((hour) => (
                  <option key={hour} value={hour}>
                    {pad2(hour)}
                  </option>
                ))}
              </select>
              <span className="date-picker__time-sep">:</span>
              <select
                className="date-picker__time-select"
                value={pickerMinute}
                aria-label="Minute"
                onMouseDown={(e) => e.stopPropagation()}
                onChange={(e) => {
                  const minute = Number(e.target.value);
                  setPickerMinute(minute);
                  applyPickerTime(pickerHour, minute);
                }}
              >
                {minuteOptions.map((minute) => (
                  <option key={minute} value={minute}>
                    {pad2(minute)}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="date-picker__footer">
            <button type="button" className="date-picker__action" onClick={handleClear}>
              Clear
            </button>
            {withTime ? (
              <button
                type="button"
                className="date-picker__action date-picker__action--primary"
                onClick={() => setOpen(false)}
              >
                Done
              </button>
            ) : (
              <button type="button" className="date-picker__action date-picker__action--primary" onClick={handleToday}>
                Today
              </button>
            )}
          </div>
        </div>,
        document.body,
      )}

      {error && (
        <span id={errorId} className="field__error">
          {error}
        </span>
      )}
    </div>
  );
}
