export function sortRows(rows, key, direction) {
  if (!key) return rows;
  const factor = direction === "desc" ? -1 : 1;
  return [...rows].sort((left, right) => {
    const a = left[key];
    const b = right[key];
    if (typeof a === "number" && typeof b === "number") return (a - b) * factor;
    return String(a ?? "").localeCompare(String(b ?? ""), undefined, { numeric: true, sensitivity: "base" }) * factor;
  });
}

export function includesQuery(values, query) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return values.some((value) => String(value ?? "").toLowerCase().includes(needle));
}

export function nextNumberedId(prefix, records) {
  const numbers = records.map((record) => Number(String(record.id).replace(/\D/g, ""))).filter((value) => !Number.isNaN(value));
  const next = numbers.length ? Math.max(...numbers) + 1 : 1001;
  return `${prefix}-${next}`;
}
