import { DISCOUNT_LIMIT } from "../constants";
import { buildLegalChecklistRows, reviewComplete } from "./checklistMap";

export const checklistRows = (c) => buildLegalChecklistRows(c);

export const checklistTotal = (c) => checklistRows(c).length;

export const itemHasVerifiedFile = (row) =>
  Boolean(row?.docs?.length) && row.s === "Verified";

export const checklistDone = (c) =>
  checklistRows(c).filter(itemHasVerifiedFile).length;

export const docsVerified = (c) => c.docs.filter((d) => d.s === "Verified").length;

export const docsReady = (c) => c.docs.length >= 4 && c.docs.every((d) => d.s === "Verified");

export const checklistBlockingIncomplete = (c) =>
  checklistRows(c).some((row) => row.docs?.length && !reviewComplete(row.s));

export const isLegalDone = (c) => docsReady(c) && !checklistBlockingIncomplete(c);

export const discountCleared = (c) => c.disc <= DISCOUNT_LIMIT || c.esc === "Approved";

export const isFinanceDone = (c) => c.fr && discountCleared(c);

// What stops Approve / Conditionally Approve.
export const decisionBlockers = (c) => {
  const b = [];
  if (!docsReady(c)) b.push("Documents: at least 4 uploaded and all verified");
  if (checklistBlockingIncomplete(c)) {
    const open = checklistRows(c)
      .filter((row) => row.docs?.length && !reviewComplete(row.s))
      .map((row) => row.t);
    b.push(open.length
      ? `Verify uploaded documents on the checklist: ${open.join(", ")}`
      : "Legal checklist incomplete");
  }
  if (!discountCleared(c))
    b.push(`Discount ${c.disc}% exceeds your ${DISCOUNT_LIMIT}% limit: escalation must be approved`);
  return b;
};
