/** Lightweight date helpers (replaces date-fns within receptionist feature). */

function pad(n) {
  return String(n).padStart(2, '0');
}

export function formatDate(date) {
  const d = date instanceof Date ? date : new Date(date);
  const yyyy = d.getFullYear();
  const MM = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  return `${yyyy}-${MM}-${dd}`;
}
