export const plansSeed = [
  {
    id: "plan-starter",
    name: "Starter",
    price: 4999,
    billingCycle: "Monthly",
    tenantLimit: "1 facility",
    userLimit: 10,
    storageLimitGb: 25,
    features: [
      "Patient Registration & Records",
      "Appointments & Queue Management",
      "Billing & Payments",
      "Basic Reports",
    ],
    status: "Active",
    description: "Perfect for small clinics and health centres.",
  },
  {
    id: "plan-professional",
    name: "Professional",
    price: 8999,
    billingCycle: "Monthly",
    tenantLimit: "1 facility",
    userLimit: 25,
    storageLimitGb: 100,
    features: [
      "All Starter Features",
      "Pharmacy & Inventory",
      "Laboratory Management",
      "Advanced Reports & Dashboards",
    ],
    status: "Active",
    preferred: true,
    description: "Ideal for clinics & medical centres.",
  },
  {
    id: "plan-enterprise",
    name: "Enterprise",
    price: 14999,
    billingCycle: "Monthly",
    tenantLimit: "Multiple facilities",
    userLimit: 50,
    storageLimitGb: 500,
    features: [
      "All Professional Features",
      "User & Role Management",
      "Multi-Department Support",
      "Secure Cloud Access",
      "Dedicated Support",
    ],
    status: "Active",
    description: "Built for hospitals & large facilities.",
  },
];

export function planPricing(planName, billingCycle) {
  const plan = plansSeed.find((item) => item.name === planName);
  const monthly = plan?.price || 0;
  if (billingCycle === "Annual") {
    const amount = monthly * 10;
    return { amount, monthlyRecurring: Math.round(amount / 12) };
  }
  return { amount: monthly, monthlyRecurring: monthly };
}

export const hospitalTypes = ["Multi-specialty", "General", "Specialty", "Children's", "Diagnostic", "Teaching"];
export const billingCycles = ["Monthly", "Annual"];
export const trialPeriods = ["None", "14 days", "30 days", "60 days"];
export const tenantStatuses = ["Active", "Trial", "Suspended"];
