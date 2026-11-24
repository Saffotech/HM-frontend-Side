import { DISCOUNT_LIMIT } from "../constants";
import { EMPTY_FINANCE, financeFormFromCase, wholeRupees } from "../../../shared/api/legalCaseModel";
import {
  calcFinance,
  cycleSuffix,
  cycleUnit,
  durationLabel,
  formatRupees,
  moneyEachCycle,
} from "./financeCalc";

export { NOT_SET, billingSource, catalogTerm, manualTerm } from "../../../shared/api/legalCaseModel";
export { EMPTY_FINANCE as DEFAULT_FINANCE };
export {
  calcFinance,
  cycleSuffix,
  cycleUnit,
  durationLabel,
  formatRupees,
  moneyEachCycle,
};

export const getFinance = (caseRow) => financeFormFromCase(caseRow);

export const caseFinance = (caseRow) => {
  const form = getFinance(caseRow);
  return { f: form, k: calcFinance(form) };
};

export const fmtLakh = formatRupees;

const WHOLE_HINT = "Enter a whole number.";

export const financeFieldErrors = (values) => {
  const errors = {};
  const mark = (key, message) => {
    if (!errors[key]) errors[key] = message;
  };
  const amount = (key, label, min, max) => {
    const number = wholeRupees(values[key]);
    if (number == null) {
      mark(key, WHOLE_HINT);
      return;
    }
    if (number < min || number > max) mark(key, `${label} must be ${min}–${max}.`);
  };
  amount("std", "Standard price", 0, 10_000_000);
  amount("impl", "Implementation fee", 0, 10_000_000);
  amount("trn", "Training fee", 0, 10_000_000);
  amount("tax", "Tax %", 0, 100);
  amount("adv", "Advance %", 0, 100);
  amount("cr", "Credit days", 0, 365);
  amount("disc", "Discount %", 0, 100);
  amount("yrs", "Duration", 1, 10);
  return errors;
};

export const isInvalidFinance = (values) => Object.keys(financeFieldErrors(values)).length > 0;

export const exceedsDiscountLimit = (discount) => Number(discount) > DISCOUNT_LIMIT;

export const displayText = (value) => {
  const text = String(value ?? "").trim();
  if (!text || text === "—" || text === "\u00a0") return "Not Provided";
  return text;
};

const BILLING_LABELS = {
  Annual: "Annual Billing",
  "Half-yearly": "Half-Yearly Billing",
  Quarterly: "Quarterly Billing",
  Monthly: "Monthly Billing",
};

export const billingLabel = (frequency) => BILLING_LABELS[frequency] || displayText(frequency);

export const advanceLabel = (percent) => {
  const value = Number(percent);
  if (!Number.isFinite(value)) return "Not Provided";
  if (value === 100) return "Full Payment Upfront";
  if (value === 0) return "No Advance Payment";
  return `${value}% Advance Payment`;
};

export const creditLabel = (days) => {
  const value = Number(days);
  if (!Number.isFinite(value) || value < 0) return "Not Provided";
  if (value === 0) return "Immediately";
  if (value === 1) return "1 day";
  return `${value} days`;
};

export const paymentTermsText = (form) => billingLabel(form?.freq);

export const poLabel = (value) => {
  if (value === "Yes" || value === "No") return value;
  return "Not Provided";
};

export const subscriptionPeriod = (years) => {
  const count = Number(years);
  if (!Number.isFinite(count) || count < 1) return "Not Provided";
  return durationLabel(count);
};

export const payableTotal = (calc) => Number(calc.tot) + Number(calc.gst);

export const discountAmount = (form, calc) => Number(form.std) - Number(calc.pr);
