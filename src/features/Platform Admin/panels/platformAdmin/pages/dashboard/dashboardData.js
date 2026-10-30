/** Build a six month chart from the complete tenant list's real creation dates. */
export function registrationGrowth(hospitals, { now = new Date(), monthCount = 6 } = {}) {
  if (!Array.isArray(hospitals)) {
    return { ok: false, rows: [], error: "Registration history is unavailable." };
  }
  if (hospitals.length === 0) return { ok: true, rows: [], error: "" };

  const dated = hospitals.map((hospital) => {
    const value = hospital?.created_at || hospital?.rememberedAt;
    const date = value ? new Date(value) : null;
    return date && !Number.isNaN(date.getTime()) ? date : null;
  });
  if (dated.some((date) => date === null)) {
    return { ok: false, rows: [], error: "Registration dates are incomplete, so a trend cannot be shown." };
  }

  const current = new Date(now.getFullYear(), now.getMonth(), 1);
  const first = new Date(current.getFullYear(), current.getMonth() - Math.max(1, monthCount - 1), 1);
  const counts = new Map();
  for (let offset = 0; offset < Math.max(1, monthCount); offset += 1) {
    const month = new Date(first.getFullYear(), first.getMonth() + offset, 1);
    const key = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;
    counts.set(key, {
      key,
      label: month.toLocaleString("en-IN", { month: "short", year: "2-digit" }),
      tenants: 0,
    });
  }

  dated.forEach((date) => {
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const row = counts.get(key);
    if (row && date <= now) row.tenants += 1;
  });

  return { ok: true, rows: [...counts.values()], error: "" };
}
