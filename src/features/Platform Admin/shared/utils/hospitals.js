import { addDays, addMonths, todayInput } from "./formatDate";
import { nextNumberedId } from "./table";

export function priceFor(plan, billingCycle, isTrial) {
  if (!plan || isTrial) return { amount: 0, monthlyRecurring: 0 };
  if (billingCycle === "Annual") {
    const amount = plan.price * 10;
    return { amount, monthlyRecurring: Math.round(amount / 12) };
  }
  return { amount: plan.price, monthlyRecurring: plan.price };
}

function renewalFor(billingCycle, trialPeriod, isTrial) {
  const today = todayInput();
  if (isTrial) {
    const days = Number(String(trialPeriod).replace(/\D/g, "")) || 14;
    return addDays(today, days);
  }
  return addMonths(today, billingCycle === "Annual" ? 12 : 1);
}

// Fields are copied one by one so the administrator password never lands in the persisted demo state.
export function createHospitalRecord(input, plans, hospitals) {
  const plan = plans.find((item) => item.name === input.plan);
  const isTrial = input.tenantStatus === "Trial" || input.trialPeriod !== "None";
  const suspended = input.tenantStatus === "Suspended";
  const pricing = priceFor(plan, input.billingCycle, isTrial);
  const today = todayInput();
  const id = nextNumberedId("TNT", hospitals);
  return {
    id,
    subscriptionId: `SUB-${id.replace(/^TNT-/, "")}`,
    code: input.code.trim().toUpperCase(),
    name: input.name.trim(),
    type: input.type,
    email: input.email.trim(),
    phone: input.phone.trim(),
    address: input.address.trim(),
    city: input.city.trim(),
    state: input.state.trim(),
    postalCode: input.postalCode.trim(),
    contactPerson: input.adminName.trim(),
    adminName: input.adminName.trim(),
    adminEmail: input.adminEmail.trim(),
    adminPhone: input.adminPhone.trim(),
    plan: input.plan,
    status: suspended ? "Suspended" : "Active",
    subscriptionStatus: suspended ? "Suspended" : isTrial ? "Trial" : "Active",
    billingCycle: input.billingCycle,
    trialPeriod: input.trialPeriod,
    registeredAt: today,
    startDate: today,
    renewalDate: renewalFor(input.billingCycle, input.trialPeriod, isTrial && !suspended),
    amount: pricing.amount,
    monthlyRecurring: suspended ? 0 : pricing.monthlyRecurring,
    users: 1,
    userLimit: plan?.userLimit || 25,
    storageUsedGb: 0,
    storageLimitGb: plan?.storageLimitGb || 25,
    beds: 0,
  };
}

function digits(value) {
  return String(value || "").replace(/\D/g, "");
}

export function findPossibleDuplicates(hospitals, values) {
  const name = values.name.trim().toLowerCase();
  const email = values.email.trim().toLowerCase();
  const phone = digits(values.phone);
  const phoneHits = phone ? hospitals.filter((hospital) => digits(hospital.phone) === phone) : [];
  const phoneIsDistinct = phoneHits.length > 0 && phoneHits.length <= 2;

  return hospitals.flatMap((hospital) => {
    const reasons = [];
    if (name && hospital.name.trim().toLowerCase() === name) reasons.push("Same hospital name");
    if (email && String(hospital.email || "").trim().toLowerCase() === email) reasons.push("Same email");
    if (phoneIsDistinct && digits(hospital.phone) === phone) reasons.push("Same phone");
    if (!reasons.length) return [];
    return [{
      id: hospital.id,
      name: hospital.name,
      code: hospital.code,
      city: hospital.city,
      reasons,
    }];
  });
}