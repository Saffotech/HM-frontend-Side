import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import { DEFAULT_PHONE_CODE, normalizePhoneCode, PHONE_COUNTRY_CODES, phoneInputIssue } from "../utils/phoneNumbers";
import { fieldA11y } from "./fieldA11y";
import "./PhoneInput.css";

export default function PhoneInput({
  label,
  value = "",
  countryCode = DEFAULT_PHONE_CODE,
  onChange,
  onCountryCodeChange,
  error,
  disabled = false,
  required = false,
  autoComplete = "tel-national",
  className = "",
  maxDigits: maxDigitsOverride,
  ...inputProps
}) {
  const generatedId = useId();
  const controlId = inputProps.id || generatedId;
  const listId = `${controlId}-country-list`;
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const priorCode = useRef(normalizePhoneCode(countryCode));
  const [inputError, setInputError] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [menuBox, setMenuBox] = useState(null);
  const shownError = inputError || error;
  const a11y = fieldA11y({ id: controlId, error: shownError, ariaInvalid: inputProps["aria-invalid"] });
  const normalizedCode = normalizePhoneCode(countryCode);
  const maxDigits = maxDigitsOverride ?? (normalizedCode === DEFAULT_PHONE_CODE ? 10 : 15 - normalizedCode.replace(/\D/g, "").length);
  const codeOptions = useMemo(() => (PHONE_COUNTRY_CODES.some(([code]) => code === normalizedCode)
    ? PHONE_COUNTRY_CODES
    : [[normalizedCode, "--", "Saved country code"], ...PHONE_COUNTRY_CODES]), [normalizedCode]);
  const [selectedCountry, setSelectedCountry] = useState(() => codeOptions.find(([code]) => code === normalizedCode));
  const selectedIndex = Math.max(0, codeOptions.findIndex(([, iso]) => iso === selectedCountry?.[1] && selectedCountry?.[0] === normalizedCode));

  useEffect(() => {
    if (priorCode.current !== normalizedCode) {
      priorCode.current = normalizedCode;
      setSelectedCountry(codeOptions.find(([code]) => code === normalizedCode));
    } else if (selectedCountry?.[0] !== normalizedCode) {
      setSelectedCountry(codeOptions.find(([code]) => code === normalizedCode));
    }
  }, [codeOptions, normalizedCode, selectedCountry]);

  const placeMenu = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.min(Math.max(rect.width, 320), window.innerWidth - 24);
    const left = Math.max(12, Math.min(rect.left, window.innerWidth - width - 12));
    const roomBelow = window.innerHeight - rect.bottom - 8;
    const roomAbove = rect.top - 8;
    const openUp = roomBelow < 200 && roomAbove > roomBelow;
    setMenuBox({ left, width, top: openUp ? undefined : rect.bottom + 6, bottom: openUp ? window.innerHeight - rect.top + 6 : undefined, maxHeight: Math.max(120, Math.min(300, openUp ? roomAbove : roomBelow)) });
  };

  useLayoutEffect(() => {
    if (!open) return undefined;
    placeMenu();
    const reposition = () => placeMenu();
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const dismissOutside = (event) => {
      if (!rootRef.current?.contains(event.target) && !menuRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", dismissOutside);
    return () => document.removeEventListener("pointerdown", dismissOutside);
  }, [open]);

  useEffect(() => {
    if (open) menuRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const chooseCountry = (option) => {
    priorCode.current = option[0];
    setSelectedCountry(option);
    setOpen(false);
    setInputError("");
    onCountryCodeChange?.({ target: { value: option[0] }, currentTarget: { value: option[0] } });
  };

  const onCountryKeyDown = (event) => {
    if (disabled) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        setActive(selectedIndex);
        setOpen(true);
      } else {
        const direction = event.key === "ArrowDown" ? 1 : -1;
        setActive((index) => (index + direction + codeOptions.length) % codeOptions.length);
      }
    } else if (event.key === "Home" && open) {
      event.preventDefault();
      setActive(0);
    } else if (event.key === "End" && open) {
      event.preventDefault();
      setActive(codeOptions.length - 1);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!open) {
        setActive(selectedIndex);
        setOpen(true);
      } else chooseCountry(codeOptions[active]);
    } else if (event.key === "Escape" || event.key === "Tab") {
      setOpen(false);
    }
  };

  const handleChange = (event) => {
    const next = event.target.value;
    const issue = phoneInputIssue(next, maxDigits);
    if (issue) {
      if (/^\d*$/.test(next) && next.length < String(value ?? "").length) {
        setInputError(issue);
        onChange?.({ target: { value: next, name: inputProps.name }, currentTarget: { value: next, name: inputProps.name } });
        return;
      }
      setInputError(issue);
      return;
    }
    setInputError("");
    onChange?.({ target: { value: next, name: inputProps.name }, currentTarget: { value: next, name: inputProps.name } });
  };

  const portal = rootRef.current?.closest(".platform-root") || (typeof document === "undefined" ? null : document.body);
  const menu = open && menuBox && portal ? createPortal(
    <ul
      className="phone-country-menu"
      id={listId}
      role="listbox"
      aria-label="Country calling codes"
      ref={menuRef}
      style={menuBox}
    >
      {codeOptions.map((option, index) => (
        <li
          key={option[1]}
          id={`${listId}-option-${index}`}
          data-index={index}
          role="option"
          aria-selected={option[1] === selectedCountry?.[1]}
          className={[
            option[1] === selectedCountry?.[1] && option[0] === selectedCountry?.[0] ? "is-selected" : "",
            index === active ? "is-active" : "",
          ].filter(Boolean).join(" ")}
          onMouseEnter={() => setActive(index)}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => chooseCountry(option)}
        >
          <span className="phone-country-dial">{option[0]}</span>
          <span className="phone-country-iso">{option[1]}</span>
          <span className="phone-country-name">{option[2]}</span>
          <Check className="phone-country-check" size={15} aria-hidden="true" />
        </li>
      ))}
    </ul>,
    portal,
  ) : null;

  return (
    <div ref={rootRef} className={`phone-field field ${a11y.invalid ? "has-error" : ""} ${className}`.trim()}>
      {label ? <label className="field-label" htmlFor={controlId}>{label}{required ? " *" : ""}</label> : null}
      <div className="phone-field-controls">
        <button
          ref={triggerRef}
          type="button"
          className={`phone-country-trigger${open ? " is-open" : ""}`}
          aria-label={`${label || "Phone"} country code: ${selectedCountry?.[0]} ${selectedCountry?.[1]}`}
          aria-controls={listId}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-activedescendant={open ? `${listId}-option-${active}` : undefined}
          disabled={disabled}
          onClick={() => {
            if (open) setOpen(false);
            else {
              setActive(selectedIndex);
              setOpen(true);
            }
          }}
          onKeyDown={onCountryKeyDown}
        >
          <span className="phone-country-trigger-code">{normalizedCode}</span>
          <span className="phone-country-trigger-iso">{selectedCountry?.[1] || "IN"}</span>
          <ChevronDown size={15} aria-hidden="true" />
        </button>
        <input
          {...inputProps}
          {...a11y.inputProps}
          type="tel"
          inputMode="numeric"
          autoComplete={autoComplete}
          value={value}
          onChange={handleChange}
          disabled={disabled}
          required={required}
          aria-label={label || "Phone number"}
          placeholder={normalizedCode === DEFAULT_PHONE_CODE ? "10-digit number" : "National number"}
        />
      </div>
      {a11y.errorId ? <span className="field-error" id={a11y.errorId}>{shownError}</span> : null}
      {menu}
    </div>
  );
}
