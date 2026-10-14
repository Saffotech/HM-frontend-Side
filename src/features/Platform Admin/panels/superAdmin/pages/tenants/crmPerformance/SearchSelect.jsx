import { useEffect, useId, useRef, useState } from "react";

/** Select-like filter you can type into to narrow the options. `value` is one of `options` or `allValue`. */
export default function SearchSelect({ label, value, onChange, options, allValue = "all", allLabel, emptyText = "No matches" }) {
  const id = useId();
  const listRef = useRef(null);
  const items = [{ value: allValue, label: allLabel }, ...options.map((option) => ({ value: option, label: option }))];
  const labelFor = (current) => items.find((item) => item.value === current)?.label ?? allLabel;

  const [query, setQuery] = useState(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const term = (query ?? "").trim().toLowerCase();
  const matches = term ? items.filter((item) => item.label.toLowerCase().includes(term)) : items;
  const optionId = (index) => `${id}-option-${index}`;

  useEffect(() => {
    if (open) listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const choose = (item) => {
    onChange(item.value);
    setQuery(null);
    setOpen(false);
  };

  const openList = () => {
    setOpen(true);
    setActive(Math.max(0, items.findIndex((item) => item.value === value)));
  };

  const commitOnBlur = () => {
    const exact = matches.find((item) => item.label.toLowerCase() === term);
    if (term && (exact || matches.length === 1)) choose(exact || matches[0]);
    else {
      setQuery(null);
      setOpen(false);
    }
  };

  const onKeyDown = (event) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) return openList();
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((current) => Math.min(Math.max(current + step, 0), Math.max(matches.length - 1, 0)));
    } else if (event.key === "Enter" && open) {
      event.preventDefault();
      if (matches[active]) choose(matches[active]);
    } else if (event.key === "Escape" && open) {
      event.preventDefault();
      setQuery(null);
      setOpen(false);
    }
  };

  return (
    <div className="field cp-combo">
      <label className="field-label" htmlFor={`${id}-input`}>{label}</label>
      <div className="cp-combo-box">
        <input
          id={`${id}-input`}
          type="text"
          role="combobox"
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          aria-activedescendant={open && matches[active] ? optionId(active) : undefined}
          placeholder="Type to search"
          value={query ?? labelFor(value)}
          onFocus={(event) => { event.target.select(); openList(); }}
          onClick={() => { if (!open) openList(); }}
          onChange={(event) => { setQuery(event.target.value); setOpen(true); setActive(0); }}
          onBlur={commitOnBlur}
          onKeyDown={onKeyDown}
        />
        {open && (
          <ul className="cp-combo-list" id={`${id}-list`} role="listbox" ref={listRef}>
            {matches.length === 0 ? (
              <li className="cp-combo-empty">{emptyText}</li>
            ) : matches.map((item, index) => (
              <li
                key={item.value}
                id={optionId(index)}
                data-index={index}
                role="option"
                aria-selected={item.value === value}
                className={index === active ? "active" : ""}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActive(index)}
                onClick={() => choose(item)}
              >
                {item.label}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
