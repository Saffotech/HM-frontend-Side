import { useId } from "react";
import { fieldA11y } from "./fieldA11y";
import "./Input.css";

export default function Input({
  label,
  error,
  as = "input",
  className = "",
  id,
  "aria-describedby": describedBy,
  "aria-invalid": ariaInvalid,
  ...props
}) {
  const generatedId = useId();
  const controlId = id || generatedId;
  const a11y = fieldA11y({ id: controlId, error, describedBy, ariaInvalid });
  const Control = as;
  return (
    <label className={`field ${a11y.invalid ? "has-error" : ""} ${className}`.trim()} htmlFor={controlId}>
      {label && <span className="field-label">{label}</span>}
      <Control {...props} {...a11y.inputProps} />
      {a11y.errorId ? <span className="field-error" id={a11y.errorId}>{error}</span> : null}
    </label>
  );
}
