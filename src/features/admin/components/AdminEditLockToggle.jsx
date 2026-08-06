/**
 * Super Admin only — ON/OFF gate for whether Hospital Admin may edit a card.
 */
export default function AdminEditLockToggle({
  id,
  checked,
  onChange,
  disabled = false,
  label = 'Admin can edit',
}) {
  return (
    <label className="aos-admin-edit-lock" htmlFor={id} onClick={(e) => e.stopPropagation()}>
      <span className="aos-admin-edit-lock__label">{label}</span>
      <input
        id={id}
        type="checkbox"
        className="aos-toggle__input"
        role="switch"
        aria-checked={Boolean(checked)}
        checked={Boolean(checked)}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="aos-toggle__track" aria-hidden />
    </label>
  );
}
