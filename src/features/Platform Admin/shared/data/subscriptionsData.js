export function buildSubscriptions(hospitals) {
  return hospitals.map((hospital) => ({
    id: `SUB-${hospital.id}`,
    tenantId: hospital.id,
    tenant: hospital.name,
    plan: hospital.plan,
    status: hospital.subscriptionStatus,
    startDate: hospital.startDate,
    renewalDate: hospital.renewalDate,
    billingCycle: hospital.billingCycle,
    amount: hospital.amount,
    monthlyRecurring: hospital.monthlyRecurring,
  }));
}
