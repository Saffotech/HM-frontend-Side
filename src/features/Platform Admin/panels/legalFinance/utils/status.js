export const STATUS_TONE = {
  Verified: "ok",
  Done: "ok",
  Received: "ok",
  "Not received": "wn",
  Issued: "in",
  Raised: "in",
  Approved: "ok",
  "Not needed": "mu",
  "Conditionally Approved": "wn",
  "Pending Review": "wn",
  Pending: "wn",
  "New from CRM": "in",
  "In Review": "in",
  "Changes Requested": "er",
  Rejected: "er",
  "Issue Found": "er",
  "Not requested": "wn",
  "Not applicable": "mu",
};

export const TONE_ICON = { ok: "✓", wn: "◔", er: "!", in: "●", mu: "○" };

export const STATUS_GROUPS = {
  Pending: ["New from CRM", "In Review"],
  Approved: ["Approved"],
  "Conditionally Approved": ["Conditionally Approved"],
  "Changes Requested": ["Changes Requested"],
  Rejected: ["Rejected"],
};

export const CHECKLIST_OPTIONS = ["Pending", "Verified", "Issue Found", "Not applicable"];
