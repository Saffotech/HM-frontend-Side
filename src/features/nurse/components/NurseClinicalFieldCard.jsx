/**
 * Shared clinical section card — matches Update Nursing Note layout.
 * Used for notes/vitals view (read-only) and edit forms.
 */
export function NurseClinicalFieldIcon({ icon: Icon, accent }) {
  return (
    <div className={`nurse-clinical-field__icon nurse-clinical-field__icon--${accent}`}>
      <Icon size={16} />
    </div>
  );
}

export function NurseClinicalFieldShell({
  accent,
  icon: Icon,
  label,
  children,
  onClear,
  clearDisabled = true,
  clearContent = 'Clear',
}) {
  return (
    <div className={`nurse-clinical-field nurse-clinical-field--${accent}`}>
      <div className="nurse-clinical-field__top">
        <div className="nurse-clinical-field__label">
          <NurseClinicalFieldIcon icon={Icon} accent={accent} />
          <span className="nurse-clinical-field__title">{label}</span>
        </div>
        {onClear ? (
          <button
            type="button"
            className="nurse-clinical-field__clear"
            onClick={onClear}
            disabled={clearDisabled}
          >
            {clearContent}
          </button>
        ) : null}
      </div>
      {children}
    </div>
  );
}

export function NurseClinicalReadonlyValue({
  children,
  empty = 'None recorded.',
  multiline = false,
  rows = 4,
}) {
  const text = children == null || children === '' ? empty : String(children);
  const className = 'nurse-clinical-field__input nurse-clinical-field__input--readonly';

  if (multiline) {
    return (
      <textarea
        readOnly
        rows={rows}
        className={`nurse-textarea ${className}`}
        value={text}
        aria-readonly="true"
      />
    );
  }

  return (
    <input
      readOnly
      type="text"
      className={`nurse-input ${className}`}
      value={text}
      aria-readonly="true"
    />
  );
}
