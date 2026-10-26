import { platformApi } from "./platformClient.js";

export {
  mapPerformanceEmployee,
  mapPerformanceInvoice,
  parseCrmPerformance,
} from "./platformCrmPerformanceModel.js";

/** GET /platform/crm/performance. Leads, CRM employees, and paid invoices for the performance page. */
export function getCrmPerformance() {
  return platformApi("/platform/crm/performance");
}
