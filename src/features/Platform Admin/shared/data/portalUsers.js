export const PORTAL_USERS = [
  {
    id: "PLT-1",
    portal: "platform",
    name: "Saffo Admin",
    email: "saffo.admin@saffocare.example",
    password: "demo123",
    role: "Platform Super Admin",
  },
  {
    id: "CRM-1",
    portal: "crm",
    name: "Meera Iyer",
    email: "crm@saffocare.example",
    password: "demo123",
    role: "CRM",
  },
  {
    id: "ACC-1",
    portal: "accountant",
    name: "Priya Nair",
    email: "accounts@saffocare.example",
    password: "demo123",
    role: "Accountant",
  },
];

export function findPortalUser(portal, email, password) {
  const normalized = String(email || "").trim().toLowerCase();
  return PORTAL_USERS.find((user) => (
    user.portal === portal
    && user.email === normalized
    && user.password === password
  )) || null;
}
