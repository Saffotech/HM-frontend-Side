import { planPricing } from "./plansData";

export const invoicesSeed = [
  invoice("INV-2025-1101", "TNT-1001", "City General Hospital", "2025-11-12", "2025-11-26", "Paid", "Bank transfer", "Professional", "Annual"),
  invoice("INV-2025-1201", "TNT-1002", "Lakeside Medical Center", "2025-12-03", "2025-12-17", "Paid", "Bank transfer", "Enterprise", "Annual"),
  invoice("INV-2026-0101", "TNT-1004", "Greenfield Community Hospital", "2026-01-09", "2026-01-23", "Paid", "Card", "Starter", "Monthly"),
  invoice("INV-2026-0201", "TNT-1005", "Apex Heart Institute", "2026-02-02", "2026-02-16", "Paid", "Bank transfer", "Enterprise", "Annual"),
  invoice("INV-2026-0301", "TNT-1007", "Harmony Women's Hospital", "2026-03-06", "2026-03-20", "Paid", "UPI", "Professional", "Monthly"),
  invoice("INV-2026-0401", "TNT-1009", "Oakridge Multispecialty", "2026-04-11", "2026-04-25", "Paid", "Card", "Professional", "Annual"),
  invoice("INV-2026-0501", "TNT-1011", "Meridian Cancer Care", "2026-05-07", "2026-05-21", "Paid", "Bank transfer", "Enterprise", "Annual"),
  invoice("INV-2026-0601", "TNT-1013", "Silverline Orthopedics", "2026-06-19", "2026-07-03", "Paid", "Card", "Professional", "Monthly"),
  invoice("INV-2026-0701", "TNT-1014", "Harborview Medical", "2026-07-15", "2026-07-29", "Paid", "Bank transfer", "Professional", "Annual"),
  invoice("INV-2026-0801", "TNT-1016", "Evergreen Rural Hospital", "2026-08-26", "2026-09-09", "Paid", "UPI", "Starter", "Monthly"),
  invoice("INV-2026-0901", "TNT-1017", "Nova Surgical Center", "2026-09-09", "2026-09-23", "Paid", "Card", "Professional", "Monthly"),
  invoice("INV-2026-1001", "TNT-1018", "Westbridge Healthcare", "2026-10-01", "2026-10-15", "Paid", "Bank transfer", "Enterprise", "Annual"),
  invoice("INV-2026-1007", "TNT-1007", "Harmony Women's Hospital", "2026-10-01", "2026-10-08", "Failed", "Card", "Professional", "Monthly"),
  invoice("INV-2026-1008", "TNT-1015", "Crescent Maternity", "2026-09-08", "2026-09-22", "Overdue", "UPI", "Starter", "Monthly"),
  invoice("INV-2026-1009", "TNT-1004", "Greenfield Community Hospital", "2026-10-09", "2026-10-23", "Pending", "UPI", "Starter", "Monthly"),
  invoice("INV-2026-1010", "TNT-1013", "Silverline Orthopedics", "2026-10-12", "2026-10-26", "Pending", "Card", "Professional", "Monthly"),
  invoice("INV-2026-1011", "TNT-1001", "City General Hospital", "2026-09-25", "2026-10-09", "Pending", "Bank transfer", "Professional", "Annual"),
  invoice("INV-2026-1012", "TNT-1009", "Oakridge Multispecialty", "2026-09-27", "2026-10-11", "Pending", "Card", "Professional", "Annual"),
  invoice("INV-2026-1013", "TNT-1017", "Nova Surgical Center", "2026-10-02", "2026-10-09", "Pending", "UPI", "Professional", "Monthly"),
];

function invoice(number, tenantId, tenant, invoiceDate, dueDate, status, method, plan, cycle) {
  return {
    id: number,
    number,
    tenantId,
    subscriptionId: `SUB-${String(tenantId).replace(/^TNT-/, "")}`,
    tenant,
    invoiceDate,
    dueDate,
    amount: planPricing(plan, cycle).amount,
    status,
    method,
    plan,
    cycle,
  };
}
