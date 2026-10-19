/** Values accepted by the current FastAPI lead and tenant schemas. Not a live catalog API. */

export const PLAN_NAMES = ["Starter", "Professional", "Enterprise"];
export const hospitalTypes = [
  "Multi-specialty",
  "General",
  "Specialty",
  "Children's",
  "Diagnostic",
  "Teaching",
];
export const billingCycles = ["Monthly", "Annual"];
export const trialPeriods = ["None", "14 days", "30 days", "60 days"];
export const tenantStatuses = ["Active", "Trial", "Suspended"];
export const CONTACT_METHODS = ["Phone call", "Email", "WhatsApp", "Video meeting", "Site visit"];
export const CLOSE_REASONS = [
  "Not interested",
  "Budget constraints",
  "Chose another vendor",
  "Unreachable",
  "Duplicate request",
];
