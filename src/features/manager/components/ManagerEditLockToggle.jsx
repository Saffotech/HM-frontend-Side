/**
 * Admin only — ON/OFF gate for whether Manager may edit a card.
 */
/* Legacy identifier preserved: AdminEditLockToggle. Active name: ManagerEditLockToggle. */
export default function ManagerEditLockToggle({
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
