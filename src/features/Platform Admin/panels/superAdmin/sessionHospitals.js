function registeredOn(hospital) {
  return hospital.created_at || hospital.rememberedAt;
}

function monthLabel(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("en-IN", { month: "short", year: "2-digit" });
}

export function registrationsThisMonth(hospitals) {
  const now = new Date();
  return hospitals.filter((hospital) => {
    const date = new Date(registeredOn(hospital));
    return !Number.isNaN(date.getTime())
      && date.getMonth() === now.getMonth()
      && date.getFullYear() === now.getFullYear();
  }).length;
}

export function registrationMonths(hospitals) {
  const counts = new Map();
  hospitals.forEach((hospital) => {
    const label = monthLabel(registeredOn(hospital));
    if (!label) return;
    counts.set(label, (counts.get(label) || 0) + 1);
  });
  return [...counts.entries()].map(([label, tenants]) => ({ label, tenants }));
}

export function planSlices(hospitals) {
  const counts = new Map();
  hospitals.forEach((hospital) => {
    const name = hospital.plan || "Unassigned";
    counts.set(name, (counts.get(name) || 0) + 1);
  });
  return [...counts.entries()].map(([name, value]) => ({ name, value }));
}

export function locationBars(hospitals) {
  const counts = new Map();
  hospitals.forEach((hospital) => {
    const name = hospital.state || hospital.city;
    if (!name) return;
    counts.set(name, (counts.get(name) || 0) + 1);
  });
  return [...counts.entries()].map(([name, value]) => ({ name, value }));
}

export function statusRows(hospitals) {
  const counts = new Map([
    ["Active", 0],
    ["Trial", 0],
    ["Suspended", 0],
  ]);
  hospitals.forEach((hospital) => {
    const name = hospital.is_active === false
      ? "Suspended"
      : (hospital.subscription_status || hospital.tenant_status || "Active");
    counts.set(name, (counts.get(name) || 0) + 1);
  });
  return [...counts.entries()].map(([name, value]) => ({ name, value }));
}
