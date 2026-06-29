import './Textarea.css';

export default function Textarea({
  label,
  value,
  onChange,
  placeholder,
  required = false,
  rows = 3,
  className = '',
}) {
  return (
    <div className={`textarea-field ${className}`}>
      {label && <label className="textarea-field__label">{label}</label>}
      <textarea
        className="textarea-field__input"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        rows={rows}
      />
    </div>
  );
}
