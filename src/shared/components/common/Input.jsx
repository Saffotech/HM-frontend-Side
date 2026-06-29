import { useId } from 'react';
import './Input.css';

export default function Input({
  label,
  id,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false,
  disabled = false,
  error,
  className = '',
  min,
  max,
  step,
  readOnly = false,
}) {
  const autoId = useId();
  const inputId =
    id ||
    (typeof label === 'string' ? label.toLowerCase().replace(/\s/g, '-') : autoId);
  const errorId = `${inputId}-error`;

  return (
    <div className={`field ${className}`}>
      {label && (
        <label htmlFor={inputId} className="field__label">
          {label}
        </label>
      )}
      <input
        id={inputId}
        type={type}
        className={`field__input ${error ? 'field__input--error' : ''}`}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        readOnly={readOnly}
        min={min}
        max={max}
        step={step}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
      />
      {error && (
        <span id={errorId} className="field__error">
          {error}
        </span>
      )}
    </div>
  );
}
