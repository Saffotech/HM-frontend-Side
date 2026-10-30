import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  accountantBackTitle,
  createInAppHistory,
  isAccountantLocation,
  isCrmLocation,
  isPlatformAdminLocation,
  platformBackTitle,
} from "./inAppHistory.js";

function loc(key, pathname, search = "") {
  return { key, pathname, search, hash: "" };
}

describe("in-app navigation history", () => {
  it("returns to the page that opened the detail, not a fixed parent", () => {
    const history = createInAppHistory();
    history.record(loc("a", "/platform"), "POP");
    history.record(loc("c", "/platform/hospitals/4"), "PUSH");
    assert.equal(history.previousWithin(isPlatformAdminLocation).pathname, "/platform");

    const fromBilling = createInAppHistory();
    fromBilling.record(loc("b", "/platform/billing/revenue"), "POP");
    fromBilling.record(loc("c", "/platform/hospitals/4"), "PUSH");
    assert.equal(fromBilling.previousWithin(isPlatformAdminLocation).pathname, "/platform/billing/revenue");

    const fromHospitals = createInAppHistory();
    fromHospitals.record(loc("d", "/platform/hospitals", "?status=trial"), "POP");
    fromHospitals.record(loc("c", "/platform/hospitals/4"), "PUSH");
    assert.equal(fromHospitals.previousWithin(isPlatformAdminLocation).search, "?status=trial");
  });

  it("walks back through the real trail", () => {
    const history = createInAppHistory();
    history.record(loc("a", "/platform/crm"), "POP");
    history.record(loc("b", "/platform/crm/follow-ups", "?view=overdue"), "PUSH");
    history.record(loc("c", "/platform/crm/leads/9"), "PUSH");
    assert.equal(history.previousWithin(isCrmLocation).pathname, "/platform/crm/follow-ups");
    history.record(loc("b", "/platform/crm/follow-ups", "?view=overdue"), "POP");
    assert.equal(history.previousWithin(isCrmLocation).pathname, "/platform/crm");
    history.record(loc("a", "/platform/crm"), "POP");
    assert.equal(history.previousWithin(isCrmLocation), null);
  });

  it("keeps the forward page after browser back and does not duplicate a strict-mode push", () => {
    const history = createInAppHistory();
    history.record(loc("a", "/platform/accounts"), "POP");
    history.record(loc("b", "/platform/accounts/invoices"), "PUSH");
    history.record(loc("b", "/platform/accounts/invoices"), "PUSH");
    history.record(loc("c", "/platform/accounts/hospitals/3"), "PUSH");
    history.record(loc("b", "/platform/accounts/invoices"), "POP");
    history.record(loc("c", "/platform/accounts/hospitals/3"), "POP");
    assert.equal(history.previousWithin(isAccountantLocation).pathname, "/platform/accounts/invoices");
    assert.equal(history.snapshot().entries.length, 3);
  });

  it("treats a refresh or direct URL as a new trail and ignores another panel", () => {
    const history = createInAppHistory();
    history.record(loc("a", "/platform"), "POP");
    history.record(loc("b", "/platform/crm/leads"), "PUSH");
    history.record(loc("c", "/platform/crm/leads/9"), "PUSH");
    history.record(loc("default", "/platform/crm/leads/9"), "POP");
    assert.equal(history.previousWithin(isCrmLocation), null);
    assert.equal(history.snapshot().entries.length, 1);

    const crossed = createInAppHistory();
    crossed.record(loc("a", "/platform/billing/revenue"), "POP");
    crossed.record(loc("b", "/platform/accounts/hospitals/3"), "PUSH");
    assert.equal(crossed.previousWithin(isAccountantLocation), null);
  });

  it("keeps list filters when a filter change replaces the current entry", () => {
    const history = createInAppHistory();
    history.record(loc("dash", "/platform/crm"), "POP");
    history.record(loc("leads", "/platform/crm/leads"), "PUSH");
    history.record(loc("leads-filtered", "/platform/crm/leads", "?tab=New"), "REPLACE");
    history.record(loc("lead", "/platform/crm/leads/9"), "PUSH");
    const previous = history.previousWithin(isCrmLocation);
    assert.equal(previous.pathname, "/platform/crm/leads");
    assert.equal(previous.search, "?tab=New");
    assert.equal(history.snapshot().entries.length, 3);
  });

  it("names the previous page inside each panel", () => {
    assert.equal(platformBackTitle("/platform"), "Dashboard");
    assert.equal(platformBackTitle("/platform/billing/revenue"), "Billing & Revenue");
    assert.equal(platformBackTitle("/platform/hospitals"), "Hospitals");
    assert.equal(accountantBackTitle("/platform/accounts"), "Collections");
    assert.equal(accountantBackTitle("/platform/accounts/invoices"), "Invoices & Payments");
    assert.equal(isPlatformAdminLocation({ pathname: "/platform/crm/leads" }), false);
    assert.equal(isCrmLocation({ pathname: "/platform/crm/leads/4" }), true);
    assert.equal(isAccountantLocation({ pathname: "https://evil.example/platform/accounts" }), false);
  });

  it("wires back controls to the shared trail instead of a fixed parent", () => {
    const root = new URL(".", import.meta.url);
    const app = readFileSync(new URL("../../PlatformApp.jsx", root), "utf8");
    const tenant = readFileSync(new URL("../../panels/platformAdmin/pages/tenants/TenantDetails.jsx", root), "utf8");
    const register = readFileSync(new URL("../../panels/platformAdmin/pages/tenants/RegisterHospital.jsx", root), "utf8");
    const billing = readFileSync(new URL("../../panels/accountant/pages/HospitalBilling.jsx", root), "utf8");
    const registration = readFileSync(new URL("../../panels/accountant/pages/RegisterHospital.jsx", root), "utf8");
    const lead = readFileSync(new URL("../../panels/crm/pages/LeadDetails.jsx", root), "utf8");
    assert.match(app, /InAppHistoryTracker/);
    for (const source of [tenant, register, billing, registration, lead]) {
      assert.match(source, /useInAppBack/);
    }
    assert.doesNotMatch(tenant, /navigate\(platformPath\("\/hospitals"\)\)/);
    assert.doesNotMatch(billing, /<Link to=\{accountsPath\("\/invoices"\)\}/);
  });
});
