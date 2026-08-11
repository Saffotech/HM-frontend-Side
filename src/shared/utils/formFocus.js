/**
 * Scroll the first invalid field into view and focus it.
 * fieldIds maps error keys → element ids.
 */
export function scrollAndFocusInvalidField(
  errors,
  fieldIds = {},
  fieldOrder,
) {
  const keys = (fieldOrder?.length ? fieldOrder : Object.keys(errors)).filter(
    (key) => Boolean(errors?.[key]),
  );

  for (const key of keys) {
    const id = fieldIds[key];
    const el =
      (id ? document.getElementById(id) : null) ||
      document.querySelector(`[data-field="${key}"]`);
    if (!el) continue;

    const target =
      el.closest(
        '.field, .searchable-select, .register-appointment__slots, .register-appointment',
      ) || el;
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });

    const focusable = el.matches('input, select, textarea, button')
      ? el
      : el.querySelector('input, select, textarea, button');

    window.setTimeout(() => {
      try {
        focusable?.focus?.({ preventScroll: true });
      } catch {
        focusable?.focus?.();
      }
    }, 280);
    return;
  }
}
