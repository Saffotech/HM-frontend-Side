import { monthKey, monthsBetween, rangeStart } from "../../../shared/utils/formatDate";

export function activeMrr(hospitals) {
  return hospitals
    .filter((hospital) => hospital.status === "Active")
    .reduce((sum, hospital) => sum + Number(hospital.monthlyRecurring || 0), 0);
}

export function registrationSeries(hospitals, preset = "12m") {
  const start = rangeStart(preset);
  const months = monthsBetween(start, new Date());
  return months.map((month) => ({
    ...month,
    tenants: hospitals.filter((hospital) => monthKey(hospital.registeredAt) === month.key).length,
  }));
}

function paidTotalsByMonth(invoices) {
  return invoices.reduce((totals, invoice) => {
    if (invoice.status !== "Paid") return totals;
    const key = monthKey(invoice.invoiceDate);
    totals[key] = (totals[key] || 0) + invoice.amount;
    return totals;
  }, {});
}

function previousMonthKey(key) {
  const [year, month] = key.split("-").map(Number);
  const date = new Date(year, month - 2, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function revenueSeries(invoices, preset = "12m") {
  const start = rangeStart(preset);
  const totals = paidTotalsByMonth(invoices);
  const months = monthsBetween(start, new Date());
  return months.map((month) => ({
    ...month,
    revenue: new Date(`${month.key}-01`) >= start ? totals[month.key] || 0 : 0,
  }));
}

export function revenueComparison(invoices, preset = "12m") {
  const totals = paidTotalsByMonth(invoices);
  return monthsBetween(rangeStart(preset), new Date()).map((month) => ({
    ...month,
    current: totals[month.key] || 0,
    previous: totals[previousMonthKey(month.key)] || 0,
  }));
}

export function inRange(dateValue, preset) {
  const start = rangeStart(preset);
  const date = new Date(dateValue);
  return date >= start && date <= new Date();
}
