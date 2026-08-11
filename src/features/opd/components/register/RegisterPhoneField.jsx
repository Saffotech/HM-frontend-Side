import { useId } from 'react';
import { formatPhoneInput } from '@/shared/utils/validators';

/** Common dial codes for OPD patient registration only. */
export const REGISTER_PHONE_COUNTRY_CODES = [
  { value: '+91', label: '+91 (IN)' },
  { value: '+92', label: '+92 (PK)' },
  { value: '+880', label: '+880 (BD)' },
  { value: '+977', label: '+977 (NP)' },
  { value: '+94', label: '+94 (LK)' },
  { value: '+971', label: '+971 (AE)' },
  { value: '+65', label: '+65 (SG)' },
  { value: '+44', label: '+44 (UK)' },
  { value: '+1', label: '+1 (US/CA)' },
  { value: '+61', label: '+61 (AU)' },
];

/**
 * Phone input with country-code selector — used only on Register Patient.
 * National number stays 10 digits for existing OPD search/register APIs.
 */
export default function RegisterPhoneField({
  id,
  phoneCode,
  phone,
  onPhoneCodeChange,
  onPhoneChange,
  onBlur,
  error,
  disabled = false,
}) {
  const autoId = useId();
  const inputId = id || `register-phone-${autoId}`;
  const errorId = `${inputId}-error`;

  return (
    <div className={`field register-phone-field${error ? ' register-phone-field--error' : ''}`}>
      <label htmlFor={inputId} className="field__label">
        Phone
      </label>
      <div className="register-phone-field__control">
        <select
          className="register-phone-field__code"
          value={phoneCode}
          onChange={(e) => onPhoneCodeChange(e.target.value)}
          disabled={disabled}
          aria-label="Country code"
        >
          {REGISTER_PHONE_COUNTRY_CODES.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <input
          id={inputId}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          className={`field__input register-phone-field__input${error ? ' field__input--error' : ''}`}
          value={phone}
          onChange={(e) => onPhoneChange(formatPhoneInput(e.target.value))}
          onBlur={onBlur}
          placeholder="10-digit number"
          maxLength={10}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
        />
      </div>
      {error ? (
        <p id={errorId} className="field__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
