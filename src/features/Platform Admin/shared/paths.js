export const PLATFORM_BASE = "/platform";
export const CRM_BASE = `${PLATFORM_BASE}/crm`;
export const ACCOUNTS_BASE = `${PLATFORM_BASE}/accounts`;

function join(base, path) {
  if (!path || path === "/") return base;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export const platformPath = (path) => join(PLATFORM_BASE, path);
export const crmPath = (path) => join(CRM_BASE, path);
export const accountsPath = (path) => join(ACCOUNTS_BASE, path);
