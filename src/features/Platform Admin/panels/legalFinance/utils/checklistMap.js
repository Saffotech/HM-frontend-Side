/** API checklist label for each upload category. Backend still uses the longer labels. */
export const CATEGORY_CHECKLIST = {
  "Hospital Registration": "Hospital registration documents reviewed",
  "Entity Registration": "Legal entity identity verified",
  "Authorized Representative": "Authorized signatory verified",
  "Tax / GST Details": "Tax / GST details reviewed",
  "Hospital License": "Relevant licenses checked (where applicable)",
  "Service Agreement": "Agreement and data protection terms reviewed",
  "Hospital address checked": "Hospital address checked",
  "Contract signing requirements checked": "Contract signing requirements checked",
};

export const CHECKLIST_CATEGORY = Object.fromEntries(
  Object.entries(CATEGORY_CHECKLIST).map(([category, label]) => [label, category]),
);

export const TAX_GST_CATEGORY = "Tax / GST Details";
export const TAX_GST_LABEL = CATEGORY_CHECKLIST[TAX_GST_CATEGORY];

export function checklistStatusFromDocuments(docs) {
  if (!docs?.length) return null;
  if (docs.some((doc) => doc.s === "Changes Requested")) return "Issue Found";
  if (docs.some((doc) => doc.s !== "Verified")) return "Pending";
  return "Verified";
}

function docsForCategory(c, category) {
  return (c?.docs || []).filter((doc) => doc.t === category);
}

function rowFromChecklistItem(item, index, c) {
  const category = CHECKLIST_CATEGORY[item.t] || "";
  const docs = category ? docsForCategory(c, category) : [];
  return {
    key: item.id != null ? `cl-${item.id}` : `cl-${item.t}`,
    t: category || item.t,
    apiLabel: item.t,
    s: item.s,
    n: item.n || "",
    id: item.id,
    category,
    docs,
    clIndex: index,
    source: "checklist",
  };
}

function categoryRow(c, category, item, index) {
  const docs = docsForCategory(c, category);
  if (item) return rowFromChecklistItem(item, index, c);
  return {
    key: `cat-${category}`,
    t: category,
    apiLabel: CATEGORY_CHECKLIST[category],
    s: checklistStatusFromDocuments(docs) || "Pending",
    n: "",
    id: null,
    category,
    docs,
    clIndex: -1,
    source: "document",
  };
}

/** One checklist row per upload category (same names), then review-only API items. */
export function buildLegalChecklistRows(c) {
  const items = c?.cl || [];
  const used = new Set();
  const rows = Object.keys(CATEGORY_CHECKLIST).map((category) => {
    const index = items.findIndex((item) => item.t === CATEGORY_CHECKLIST[category]);
    if (index >= 0) used.add(index);
    return categoryRow(c, category, index >= 0 ? items[index] : null, index);
  });
  items.forEach((item, index) => {
    if (used.has(index)) return;
    rows.push(rowFromChecklistItem(item, index, c));
  });
  return rows;
}

export const reviewComplete = (status) => status === "Verified" || status === "Not applicable";

/** Checklist rows that still need a file. Already uploaded categories are omitted. */
export function availableUploadOptions(c) {
  return buildLegalChecklistRows(c)
    .filter((row) => !row.docs?.length)
    .map((row) => ({
      value: row.category || row.t,
      label: row.t,
    }));
}
