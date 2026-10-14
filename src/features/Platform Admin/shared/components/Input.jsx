import "./Input.css";

export default function Input({ label, error, as = "input", className = "", ...props }) {
  const Control = as;
  return (
    <label className={`field ${error ? "has-error" : ""} ${className}`.trim()}>
      {label && <span className="field-label">{label}</span>}
      <Control {...props} />
      {error && <span className="field-error">{error}</span>}
    </label>
  );
}
