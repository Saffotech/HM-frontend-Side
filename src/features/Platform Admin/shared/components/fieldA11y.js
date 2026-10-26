/** Accessible name wiring for a field error. Ids stay unique per control. */
export function fieldA11y({ id, error, describedBy, ariaInvalid }) {
  const hasError = error != null && error !== false && error !== "";
  const invalid = hasError || ariaInvalid === true || ariaInvalid === "true";
  const errorId = hasError ? `${id}-error` : "";
  const described = [describedBy, errorId].filter(Boolean).join(" ") || undefined;
  return {
    invalid,
    errorId,
    inputProps: {
      id,
      "aria-invalid": invalid ? "true" : undefined,
      "aria-describedby": described,
    },
  };
}
