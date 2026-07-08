/** Mock Super Admin reports — replace when dedicated super-admin reports API exists. */

const MOCK_DELAY = 500;

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export async function getReportsSummary() {
  await new Promise((r) => setTimeout(r, MOCK_DELAY));
  return {
    total_staff: 312,
    active_staff: 289,
    total_patients_this_month: 1843,
    revenue_this_month: 482500,
    avg_daily_patients: 62,
    occupancy_rate: 74,
  };
}

export async function getStaffByRole() {
  await new Promise((r) => setTimeout(r, MOCK_DELAY));
  return [
    { role: 'Doctor', count: 48 },
    { role: 'Nurse', count: 121 },
    { role: 'Admin', count: 14 },
    { role: 'Technician', count: 55 },
    { role: 'Pharmacist', count: 22 },
    { role: 'Receptionist', count: 30 },
    { role: 'Other', count: 22 },
  ];
}

export async function getMonthlyRevenue() {
  await new Promise((r) => setTimeout(r, MOCK_DELAY));
  return Array.from({ length: 6 }, (_, i) => ({
    month: `Month ${i + 1}`,
    revenue: rand(300000, 550000),
  }));
}

export async function getRecentActivity() {
  await new Promise((r) => setTimeout(r, MOCK_DELAY));
  return [
    { date: '2026-03-01', department: 'OPD', patients: 142, revenue: 85400 },
    { date: '2026-03-02', department: 'Pharmacy', patients: 89, revenue: 42100 },
    { date: '2026-03-03', department: 'Laboratory', patients: 64, revenue: 31800 },
  ];
}
