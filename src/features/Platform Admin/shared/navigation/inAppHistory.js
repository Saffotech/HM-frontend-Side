const PLATFORM_BASE = "/platform";
const CRM_BASE = "/platform/crm";
const ACCOUNTS_BASE = "/platform/accounts";

function bare(pathname) {
  const path = String(pathname || "").split("?")[0].split("#")[0];
  if (path.length > 1 && path.endsWith("/")) return path.slice(0, -1);
  return path;
}

function matches(pathname, prefix) {
  const path = bare(pathname);
  return path === prefix || path.startsWith(`${prefix}/`);
}

/** Platform Admin screens. CRM and Accountant stay in their own panels. */
export function isPlatformAdminLocation(entry) {
  const path = bare(entry?.pathname);
  if (!path.startsWith(PLATFORM_BASE)) return false;
  if (matches(path, CRM_BASE) || matches(path, ACCOUNTS_BASE)) return false;
  if (path.endsWith("/login")) return false;
  return true;
}

export function isCrmLocation(entry) {
  return matches(entry?.pathname, CRM_BASE);
}

export function isAccountantLocation(entry) {
  return matches(entry?.pathname, ACCOUNTS_BASE);
}

const PLATFORM_TITLES = [
  ["/platform/billing/revenue", "Billing & Revenue"],
  ["/platform/billing/subscriptions", "Subscriptions"],
  ["/platform/billing/plans", "Subscription Plans"],
  ["/platform/hospitals/register", "Register Hospital"],
  ["/platform/crm-performance", "CRM & Performance"],
  ["/platform/analytics", "Platform Analytics"],
  ["/platform/staff", "Platform Staff"],
  ["/platform/profile", "Profile"],
  ["/platform/hospitals", "Hospitals"],
];

const ACCOUNTANT_TITLES = [
  ["/platform/accounts/invoices", "Invoices & Payments"],
  ["/platform/accounts/registrations", "Hospital Registrations"],
  ["/platform/accounts/hospitals", "Hospital"],
  ["/platform/accounts/profile", "Profile"],
  ["/platform/accounts", "Collections"],
];

function titleFor(pathname, titles, home, homeLabel) {
  const path = bare(pathname);
  if (path === home) return homeLabel;
  const match = titles.find(([prefix]) => path === prefix || path.startsWith(`${prefix}/`));
  return match ? match[1] : "";
}

export function platformBackTitle(pathname) {
  const path = bare(pathname);
  if (/^\/platform\/hospitals\/[^/]+$/.test(path)) return "Hospital";
  return titleFor(pathname, PLATFORM_TITLES, PLATFORM_BASE, "Dashboard");
}

export function accountantBackTitle(pathname) {
  return titleFor(pathname, ACCOUNTANT_TITLES, ACCOUNTS_BASE, "Collections");
}

function entryFrom(location) {
  return {
    key: location?.key || "default",
    pathname: location?.pathname || "",
    search: location?.search || "",
    hash: location?.hash || "",
  };
}

function sameEntry(left, right) {
  return left?.key === right?.key
    && left?.pathname === right?.pathname
    && left?.search === right?.search
    && left?.hash === right?.hash;
}

/**
 * In-app trail for one router session.
 * Refresh and a direct URL start a new trail. Browser back and forward move within it.
 */
export function createInAppHistory() {
  let entries = [];
  let index = -1;

  function snapshot() {
    return { entries: entries.map((entry) => ({ ...entry })), index };
  }

  function record(location, navigationType) {
    const entry = entryFrom(location);
    const type = navigationType || "POP";

    if (type === "PUSH") {
      if (sameEntry(entries[index], entry)) return snapshot();
      entries = entries.slice(0, index + 1);
      entries.push(entry);
      index = entries.length - 1;
      return snapshot();
    }

    if (type === "REPLACE") {
      if (index < 0) {
        entries = [entry];
        index = 0;
        return snapshot();
      }
      if (sameEntry(entries[index], entry)) return snapshot();
      entries[index] = entry;
      entries = entries.slice(0, index + 1);
      return snapshot();
    }

    const found = entries.findIndex((item) => item.key === entry.key);
    if (found >= 0) {
      entries[found] = entry;
      index = found;
      return snapshot();
    }

    entries = [entry];
    index = 0;
    return snapshot();
  }

  function previousWithin(belongs) {
    if (index < 1) return null;
    const previous = entries[index - 1];
    return belongs(previous) ? { ...previous } : null;
  }

  return { record, snapshot, previousWithin };
}
