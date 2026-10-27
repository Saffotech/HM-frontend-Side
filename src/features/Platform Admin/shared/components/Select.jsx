import { Children, isValidElement, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { fieldA11y } from "./fieldA11y";
import "./Input.css";
import "./Select.css";

function optionText(children) {
  if (children == null || typeof children === "boolean") return "";
  if (typeof children === "string" || typeof children === "number") return String(children);
  if (Array.isArray(children)) return children.map(optionText).join("");
  return "";
}

function optionsFrom(children, into = []) {
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    if (child.type === "optgroup") {
      optionsFrom(child.props.children, into);
      return;
    }
    if (child.type !== "option") return;
    const label = optionText(child.props.children);
    const value = child.props.value == null ? label : String(child.props.value);
    into.push({ value, label, disabled: Boolean(child.props.disabled) });
  });
  return into;
}

function menuPosition(anchor) {
  const rect = anchor.getBoundingClientRect();
  const gap = 4;
  const below = window.innerHeight - rect.bottom - gap;
  const above = rect.top - gap;
  const openUp = below < 180 && above > below;
  const maxHeight = Math.max(120, Math.min(280, openUp ? above : below));
  return {
    left: rect.left,
    width: rect.width,
    maxHeight,
    top: openUp ? undefined : rect.bottom + gap,
    bottom: openUp ? window.innerHeight - rect.top + gap : undefined,
  };
}

function nextEnabled(options, start, step) {
  if (!options.length) return 0;
  for (let offset = 1; offset <= options.length; offset += 1) {
    const index = (start + step * offset + options.length) % options.length;
    if (!options[index].disabled) return index;
  }
  return start;
}

export default function Select({
  label,
  error,
  children,
  className = "",
  id,
  value,
  onChange,
  disabled = false,
  required = false,
  name,
  "aria-describedby": describedBy,
  "aria-invalid": ariaInvalid,
  ...props
}) {
  const generatedId = useId();
  const controlId = id || generatedId;
  const listId = `${controlId}-list`;
  const a11y = fieldA11y({ id: controlId, error, describedBy, ariaInvalid });
  const options = optionsFrom(children);
  const current = String(value ?? "");
  const selected = options.find((option) => option.value === current);
  const rootRef = useRef(null);
  const menuRef = useRef(null);
  const typed = useRef("");
  const typedAt = useRef(0);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [box, setBox] = useState(null);

  const place = () => {
    const anchor = rootRef.current?.querySelector(".admin-select");
    if (anchor) setBox(menuPosition(anchor));
  };

  const openMenu = () => {
    if (disabled) return;
    const index = Math.max(0, options.findIndex((option) => option.value === current));
    setActive(options[index]?.disabled ? nextEnabled(options, index, 1) : index);
    setOpen(true);
  };

  const choose = (option) => {
    if (!option || option.disabled) return;
    setOpen(false);
    if (option.value === current) return;
    onChange?.({ target: { value: option.value, name }, currentTarget: { value: option.value, name } });
  };

  useLayoutEffect(() => {
    if (!open) return undefined;
    place();
    const onScroll = (event) => {
      if (menuRef.current?.contains(event.target)) return;
      place();
    };
    window.addEventListener("resize", onScroll);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (event) => {
      const target = event.target;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const onKeyDown = (event) => {
    if (disabled) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        openMenu();
        return;
      }
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((index) => nextEnabled(options, index, step));
      return;
    }
    if (event.key === "Home" && open) {
      event.preventDefault();
      setActive(nextEnabled(options, -1, 1));
      return;
    }
    if (event.key === "End" && open) {
      event.preventDefault();
      setActive(nextEnabled(options, options.length, -1));
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!open) openMenu();
      else choose(options[active]);
      return;
    }
    if (event.key === "Escape" || event.key === "Tab") {
      setOpen(false);
      return;
    }
    if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
      const now = Date.now();
      const query = now - typedAt.current < 700 ? `${typed.current}${event.key}` : event.key;
      typed.current = query;
      typedAt.current = now;
      const found = options.findIndex((option) => !option.disabled && option.label.toLowerCase().startsWith(query.toLowerCase()));
      if (found >= 0) {
        if (!open) setOpen(true);
        setActive(found);
      }
    }
  };

  const portal = rootRef.current?.closest(".platform-root") || (typeof document !== "undefined" ? document.body : null);
  const menu = open && box && portal ? createPortal(
    <ul
      className="admin-menu"
      id={listId}
      role="listbox"
      ref={menuRef}
      style={{
        left: box.left,
        width: box.width,
        maxHeight: box.maxHeight,
        top: box.top,
        bottom: box.bottom,
      }}
    >
      {options.map((option, index) => (
        <li
          key={`${option.value}-${index}`}
          id={`${listId}-option-${index}`}
          data-index={index}
          role="option"
          aria-selected={option.value === current}
          aria-disabled={option.disabled || undefined}
          className={[
            index === active ? "is-active" : "",
            option.value === current ? "is-selected" : "",
            option.disabled ? "is-disabled" : "",
          ].filter(Boolean).join(" ")}
          onMouseEnter={() => { if (!option.disabled) setActive(index); }}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => choose(option)}
        >
          {option.label}
        </li>
      ))}
    </ul>,
    portal,
  ) : null;

  return (
    <label ref={rootRef} className={`field ${a11y.invalid ? "has-error" : ""} ${className}`.trim()} htmlFor={controlId}>
      {label && <span className="field-label">{label}</span>}
      <button
        {...props}
        {...a11y.inputProps}
        type="button"
        className={`admin-select${open ? " is-open" : ""}`}
        role="combobox"
        aria-controls={listId}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-activedescendant={open ? `${listId}-option-${active}` : undefined}
        aria-required={required || undefined}
        disabled={disabled}
        name={name}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={onKeyDown}
      >
        <span>{selected?.label || "\u00a0"}</span>
        <svg className="admin-select-chevron" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
          <path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {a11y.errorId ? <span className="field-error" id={a11y.errorId}>{error}</span> : null}
      {menu}
    </label>
  );
}
