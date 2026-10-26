const stack = [];
let lockCount = 0;
let previousOverflow = "";

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(", ");

export function resetModalFocusState() {
  stack.length = 0;
  lockCount = 0;
  previousOverflow = "";
}

export function pushModal(id) {
  stack.push(id);
}

export function popModal(id) {
  const index = stack.lastIndexOf(id);
  if (index >= 0) stack.splice(index, 1);
}

export function isTopModal(id) {
  return stack[stack.length - 1] === id;
}

export function lockPageScroll(body) {
  if (!body?.style) return () => {};
  if (lockCount === 0) {
    previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";
  }
  lockCount += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    lockCount = Math.max(0, lockCount - 1);
    if (lockCount === 0) body.style.overflow = previousOverflow;
  };
}

export function focusableElements(container) {
  if (!container?.querySelectorAll) return [];
  return [...container.querySelectorAll(FOCUSABLE)].filter((element) => {
    if (element.disabled || element.getAttribute?.("aria-hidden") === "true") return false;
    if (element.tabIndex < 0) return false;
    return true;
  });
}

/** Next element for Tab / Shift+Tab. Wraps inside the modal. */
export function nextFocusTarget(elements, current, shiftKey) {
  if (!elements.length) return null;
  const index = elements.indexOf(current);
  if (index === -1) return shiftKey ? elements[elements.length - 1] : elements[0];
  const next = shiftKey ? index - 1 : index + 1;
  if (next < 0) return elements[elements.length - 1];
  if (next >= elements.length) return elements[0];
  return elements[next];
}

export function canRestoreFocus(element) {
  if (!element || element.isConnected === false || typeof element.focus !== "function") return false;
  if (element.disabled || element.hasAttribute?.("disabled")) return false;
  if (element.getAttribute?.("aria-hidden") === "true") return false;
  return true;
}
