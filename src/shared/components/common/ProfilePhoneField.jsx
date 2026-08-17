import { formatPhoneInput } from '@/shared/utils/validators';
import {
  CUSTOM_PHONE_CODE,
  PHONE_COUNTRY_CODES,
  formatPhoneCodeInput,
  isPresetPhoneCode,
} from '@/shared/utils/phoneCountryCode';
import '@/shared/styles/profilePhoneField.css';

export default function ProfilePhoneField({
  inputClassName,
  phoneCode,
  phone,
  onPhoneCodeChange,
  onPhoneChange,
}) {
  const custom = !isPresetPhoneCode(phoneCode);

  return (
    <div className={`profile-phone${custom ? ' profile-phone--custom' : ''}`}>
      <select
        className={`${inputClassName} profile-phone__code`}
        value={custom ? CUSTOM_PHONE_CODE : phoneCode}
        onChange={(e) => {
          const next = e.target.value;
          if (next === CUSTOM_PHONE_CODE) {
            onPhoneCodeChange(isPresetPhoneCode(phoneCode) ? '+' : phoneCode || '+');
            return;
          }
          onPhoneCodeChange(next);
        }}
        aria-label="Phone country code"
      >
        {PHONE_COUNTRY_CODES.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
        <option value={CUSTOM_PHONE_CODE}>Other</option>
      </select>
      {custom ? (
        <input
          className={`${inputClassName} profile-phone__custom`}
          type="tel"
          inputMode="tel"
          autoComplete="tel-country-code"
          maxLength={5}
          placeholder="+___"
          value={phoneCode || '+'}
          onChange={(e) => onPhoneCodeChange(formatPhoneCodeInput(e.target.value))}
          aria-label="Custom phone code"
        />
      ) : null}
      <input
        className={`${inputClassName} profile-phone__number`}
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        maxLength={10}
        placeholder="10-digit number"
        value={phone}
        onChange={(e) => onPhoneChange(formatPhoneInput(e.target.value))}
      />
    </div>
  );
}
