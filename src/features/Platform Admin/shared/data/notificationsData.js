import { platformPath } from "../paths";

export const notificationsSeed = [
  { id: "NTF-1", title: "2 new hospital requests need a first call", href: platformPath("/crm-performance"), read: false, time: "2026-10-06T09:40:00" },
  { id: "NTF-2", title: "Payment failed for Harmony Women's Hospital", href: platformPath("/billing/revenue"), read: false, time: "2026-10-06T08:21:00" },
  { id: "NTF-3", title: "3 renewal invoices are due in the next 7 days", href: platformPath("/billing/revenue"), read: false, time: "2026-10-06T08:00:00" },
  { id: "NTF-4", title: "City General Hospital renews on Oct 9", href: platformPath("/billing/subscriptions"), read: true, time: "2026-10-05T09:00:00" },
];
