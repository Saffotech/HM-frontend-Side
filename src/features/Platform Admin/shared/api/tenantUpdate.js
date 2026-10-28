import { PLAN_NAMES, billingCycles } from "../data/catalog.js";
import { DEFAULT_PHONE_CODE, normalizePhoneCode, parsePhoneNumber, phoneDigits, serializePhoneNumber, validPhoneForCode } from "../utils/phoneNumbers.js";

const AMOUNT_MAX = 10000000;

function text(value) {
  return String(value ?? "").trim();
}

/** Editable hospital fields, taken from a tenant summary. */
export function tenantEditDraft(tenant) {
  const amount = tenant?.subscription_amount;
  return {
    name: tenant?.name || "",
    address: tenant?.address || "",
    ...parsePhoneNumber(tenant?.phone || ""),
    plan: tenant?.plan || "",
    billingCycle: tenant?.billing_cycle || "",
    renewsOn: String(tenant?.subscription_renews_on || "").slice(0, 10),
    amount: amount == null || amount === "" ? "" : String(amount),
  };
}

/** PATCH body containing only fields whose values changed. */
export function tenantUpdateBody(tenant, draft) {
  const current = tenantEditDraft(tenant);
  const body = {};
  if (text(draft?.name) !== text(current.name)) body.name = text(draft?.name);
  if (text(draft?.address) !== text(current.address)) body.address = text(draft?.address);
  const phoneCode = draft?.phoneCode || DEFAULT_PHONE_CODE;
  const savedPhone = parsePhoneNumber(tenant?.phone || "");
  if (phoneDigits(draft?.phone) !== savedPhone.phone || normalizePhoneCode(phoneCode) !== normalizePhoneCode(savedPhone.phoneCode)) {
    body.phone = serializePhoneNumber(draft?.phone, phoneCode);
  }
  if (draft?.plan !== current.plan) body.plan = draft?.plan;
  if (draft?.billingCycle !== current.billingCycle) body.billing_cycle = draft?.billingCycle;
  if (text(draft?.renewsOn) !== current.renewsOn) body.subscription_renews_on = text(draft?.renewsOn);
  if (text(draft?.amount) !== current.amount) body.subscription_amount = Number(text(draft?.amount));
  return body;
}

export function renewsOnIssue(value, now = new Date()) {
  const day = text(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return "Use YYYY-MM-DD.";
  const year = Number(day.slice(0, 4));
  const month = Number(day.slice(5, 7));
  const date = Number(day.slice(8, 10));
  const parsed = new Date(Date.UTC(year, month - 1, date));
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== date) {
    return "Enter a real calendar date.";
  }
  const maxYear = now.getFullYear() + 5;
  if (year < 2000 || year > maxYear) return `Use a year from 2000 through ${maxYear}.`;
  return "";
}

export function subscriptionAmountIssue(value) {
  const raw = text(value);
  if (!/^\d+$/.test(raw)) return "Enter whole rupees, from 1 to 10000000.";
  const amount = Number(raw);
  if (amount < 1 || amount > AMOUNT_MAX) return "Enter whole rupees, from 1 to 10000000.";
  return "";
}

/** Validates only the fields present on a PATCH body. */
export function validateTenantUpdate(body, now = new Date()) {
  const errors = {};
  if ("name" in body && !text(body.name)) errors.name = "Hospital name is required.";
  if ("address" in body && !text(body.address)) errors.address = "Address is required.";
  if ("phone" in body && !validPhoneForCode(parsePhoneNumber(body.phone).phone, parsePhoneNumber(body.phone).phoneCode)) {
    errors.phone = "Enter a valid phone number for the selected country code.";
  }
  if ("plan" in body && !PLAN_NAMES.includes(body.plan)) errors.plan = "Choose Starter, Professional, or Enterprise.";
  if ("billing_cycle" in body && !billingCycles.includes(body.billing_cycle)) {
    errors.billing_cycle = "Choose Monthly or Annual.";
  }
  if ("subscription_renews_on" in body) {
    const issue = renewsOnIssue(body.subscription_renews_on, now);
    if (issue) errors.subscription_renews_on = issue;
  }
  if ("subscription_amount" in body) {
    const issue = subscriptionAmountIssue(body.subscription_amount);
    if (issue) errors.subscription_amount = issue;
  }
  return errors;
}

export const TENANT_UPDATE_FIELDS = {
  name: "name",
  address: "address",
  phone: "phone",
  plan: "plan",
  billing_cycle: "billingCycle",
  subscription_renews_on: "renewsOn",
  subscription_amount: "amount",
};
