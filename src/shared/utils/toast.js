let listeners = [];

export function subscribeToast(listener) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

function notify(toast) {
  listeners.forEach((l) => l(toast));
}

let toastSeq = 0;

export function showToast(message, type = 'success') {
  const id = `${Date.now()}-${++toastSeq}`;
  notify({ id, message, type });
  setTimeout(() => notify({ id, dismiss: true }), 3500);
}

export const toast = {
  success: (msg) => showToast(msg, 'success'),
  error: (msg) => showToast(msg, 'error'),
  info: (msg) => showToast(msg, 'info'),
  warning: (msg) => showToast(msg, 'warning'),
};
