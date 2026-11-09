import { DISCOUNT_LIMIT } from "../constants";

export const checklistDone = (c) =>
  c.cl.filter((i) => i.s === "Verified" || i.s === "Not applicable").length;

export const docsVerified = (c) => c.docs.filter((d) => d.s === "Verified").length;

export const docsReady = (c) => c.docs.length >= 4 && c.docs.every((d) => d.s === "Verified");

export const isLegalDone = (c) => docsReady(c) && checklistDone(c) === c.cl.length;

export const discountCleared = (c) => c.disc <= DISCOUNT_LIMIT || c.esc === "Approved";

export const isFinanceDone = (c) => c.fr && discountCleared(c);

// What stops Approve / Conditionally Approve.
export const decisionBlockers = (c) => {
  const b = [];
  if (!docsReady(c)) b.push("Documents: at least 4 uploaded and all verified");
  if (checklistDone(c) < c.cl.length) b.push("Legal checklist incomplete");
  if (!discountCleared(c))
    b.push(`Discount ${c.disc}% exceeds your ${DISCOUNT_LIMIT}% limit: escalation must be approved`);
  return b;
};
