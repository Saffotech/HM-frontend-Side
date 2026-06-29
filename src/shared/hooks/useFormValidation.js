import { useState, useCallback, useMemo } from 'react';

export function useFormValidation(initialValues, validate) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});

  const handleChange = useCallback((name, value) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }, []);

  const handleSubmit = useCallback(
    (onValid) => (e) => {
      e?.preventDefault?.();
      const nextErrors = validate(values);
      setErrors(nextErrors);
      if (Object.keys(nextErrors).length === 0) {
        onValid(values);
      }
    },
    [validate, values]
  );

  const isValid = useMemo(() => Object.keys(validate(values)).length === 0, [validate, values]);

  return { values, errors, handleChange, handleSubmit, isValid, setValues, setErrors };
}
