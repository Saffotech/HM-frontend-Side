/* eslint-disable import/no-unresolved -- Node's test runner resolves node: imports. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { nextTabIndex } from "../../panels/crm/components/crmTabs.js";
import { profileFieldErrors } from "./platformProfileModel.js";
import { fieldA11y } from "../components/fieldA11y.js";
import {
  canRestoreFocus,
  focusableElements,
  isTopModal,
  lockPageScroll,
  nextFocusTarget,
  popModal,
  pushModal,
  resetModalFocusState,
} from "../components/modalFocus.js";
import { canSubmitRegistration } from "../utils/registrationGate.js";

function readSrc(relativePath) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

function element(extra = {}) {
  return {
    isConnected: true,
    disabled: false,
    tabIndex: 0,
    focus() {},
    hasAttribute() { return false; },
    getAttribute() { return null; },
    ...extra,
  };
}

describe("field error accessibility", () => {
  it("points an invalid field at its own error and clears that link when the error goes away", () => {
    const invalid = fieldA11y({ id: "hospital-name", error: "Hospital name is required." });
    assert.equal(invalid.invalid, true);
    assert.equal(invalid.errorId, "hospital-name-error");
    assert.equal(invalid.inputProps["aria-invalid"], "true");
    assert.equal(invalid.inputProps["aria-describedby"], "hospital-name-error");

    const cleared = fieldA11y({ id: "hospital-name", error: "" });
    assert.equal(cleared.invalid, false);
    assert.equal(cleared.errorId, "");
    assert.equal(cleared.inputProps["aria-invalid"], undefined);
    assert.equal(cleared.inputProps["aria-describedby"], undefined);
  });

  it("keeps a separate error id for every field and preserves an existing description", () => {
    const name = fieldA11y({ id: "name", error: "Required.", describedBy: "name-hint" });
    const email = fieldA11y({ id: "email", error: "Enter a valid email address." });
    assert.notEqual(name.errorId, email.errorId);
    assert.equal(name.inputProps["aria-describedby"], "name-hint name-error");
    assert.equal(email.inputProps["aria-describedby"], "email-error");
    assert.equal(fieldA11y({ id: "role", ariaInvalid: true }).inputProps["aria-invalid"], "true");
  });
});

describe("modal focus", () => {
  it("moves tab focus through the dialog and wraps at both ends", () => {
    const close = element();
    const field = element();
    const save = element();
    const items = [close, field, save];
    assert.equal(nextFocusTarget(items, close, false), field);
    assert.equal(nextFocusTarget(items, save, false), close);
    assert.equal(nextFocusTarget(items, close, true), save);
    assert.equal(nextFocusTarget(items, { id: "dialog" }, false), close);
    assert.equal(nextFocusTarget(items, { id: "dialog" }, true), save);
    assert.equal(nextFocusTarget([], close, false), null);
  });

  it("ignores disabled controls and restores focus only to a live control", () => {
    const enabled = element();
    const disabled = element({ disabled: true });
    const skipped = element({ tabIndex: -1 });
    const container = { querySelectorAll: () => [enabled, disabled, skipped] };
    assert.deepEqual(focusableElements(container), [enabled]);
    assert.equal(canRestoreFocus(enabled), true);
    assert.equal(canRestoreFocus(element({ isConnected: false })), false);
    assert.equal(canRestoreFocus(disabled), false);
    assert.equal(canRestoreFocus(element({
      getAttribute(name) { return name === "aria-hidden" ? "true" : null; },
    })), false);
    assert.equal(canRestoreFocus(null), false);
  });

  it("lets only the top dialog own escape and keeps scroll locked until the last one closes", () => {
    resetModalFocusState();
    pushModal("edit");
    pushModal("confirm");
    assert.equal(isTopModal("confirm"), true);
    assert.equal(isTopModal("edit"), false);
    popModal("confirm");
    assert.equal(isTopModal("edit"), true);

    const body = { style: { overflow: "auto" } };
    const releaseEdit = lockPageScroll(body);
    const releaseConfirm = lockPageScroll(body);
    assert.equal(body.style.overflow, "hidden");
    releaseConfirm();
    assert.equal(body.style.overflow, "hidden");
    releaseEdit();
    assert.equal(body.style.overflow, "auto");
    resetModalFocusState();
  });
});

describe("registration submit gate", () => {
  it("blocks submission without a session and blocks a second submit while one is running", () => {
    assert.equal(canSubmitRegistration({ signedIn: false, busy: false }), false);
    assert.equal(canSubmitRegistration({ signedIn: true, busy: true }), false);
    assert.equal(canSubmitRegistration({ signedIn: true, busy: false }), true);

    let busy = false;
    const calls = [];
    const submit = () => {
      if (!canSubmitRegistration({ signedIn: true, busy })) return;
      busy = true;
      calls.push("start");
    };
    submit();
    submit();
    assert.deepEqual(calls, ["start"]);
    busy = false;
    submit();
    assert.deepEqual(calls, ["start", "start"]);
  });

  it("wires the session check, the in-flight guard, and a sign-in link into the registration forms", () => {
    const platform = readSrc("../../panels/superAdmin/pages/tenants/RegisterHospital.jsx");
    const accountant = readSrc("../../panels/accountant/pages/RegisterHospital.jsx");
    const staff = readSrc("../../panels/superAdmin/pages/account/PlatformStaff.jsx");
    for (const source of [platform, accountant, staff]) {
      assert.match(source, /canSubmitRegistration/);
      assert.match(source, /disabled=\{!canSubmit\}/);
      assert.match(source, /UNIVERSAL_LOGIN/);
      assert.match(source, /Go to sign in/);
    }
    assert.match(platform, /submittingRef/);
    assert.match(accountant, /submittingRef/);
    assert.match(staff, /guard\.tryStart/);
  });
});

describe("accountant plan catalog limitation", () => {
  it("keeps the static plan list because the plan endpoint is limited to platform admins", () => {
    const accountant = readSrc("../../panels/accountant/pages/RegisterHospital.jsx");
    const platform = readSrc("../../panels/superAdmin/pages/tenants/RegisterHospital.jsx");
    assert.match(accountant, /PLAN_NAMES\.map/);
    assert.doesNotMatch(accountant, /usePlatformPlans|listPlatformPlans/);
    assert.match(platform, /usePlatformPlans/);
    assert.match(platform, /activePlanNames/);
  });
});

describe("CRM lead email fields and tabs", () => {
  it("uses email inputs in the lead edit dialog without changing the validation", () => {
    const dialogs = readSrc("../../panels/crm/workspace/CrmDialogs.jsx");
    const edit = dialogs.slice(dialogs.indexOf("export function EditLeadDialog"));
    assert.match(edit, /label="Contact email" type="email"/);
    assert.match(edit, /label="Hospital email" type="email"/);
    assert.match(edit, /isEmail\(form\.contactEmail\)/);
    assert.match(edit, /isEmail\(form\.hospitalEmail\)/);
    assert.doesNotMatch(edit, /hospital_email/);
  });

  it("moves between tabs with arrows and marks only the selected tab for the panel", () => {
    assert.equal(nextTabIndex(3, 0, "ArrowRight"), 1);
    assert.equal(nextTabIndex(3, 0, "ArrowLeft"), 2);
    assert.equal(nextTabIndex(3, 2, "ArrowRight"), 0);
    assert.equal(nextTabIndex(3, 1, "Home"), 0);
    assert.equal(nextTabIndex(3, 1, "End"), 2);
    assert.equal(nextTabIndex(3, 1, "Enter"), -1);
    assert.equal(nextTabIndex(3, -1, "ArrowRight"), -1);

    for (const file of [
      "../../panels/crm/pages/Leads.jsx",
      "../../panels/crm/pages/FollowUps.jsx",
      "../../panels/crm/pages/Conversions.jsx",
    ]) {
      const source = readSrc(file);
      assert.match(source, /role="tablist"/);
      assert.match(source, /crmTabProps/);
      assert.match(source, /crmTabPanelProps/);
      assert.match(source, /onCrmTabKeyDown/);
    }
  });
});

describe("platform page headings", () => {
  it("keeps one accessible heading and hides the duplicate visible title", () => {
    const pages = [
      ["../../panels/superAdmin/pages/tenants/Hospitals.jsx", "Hospitals"],
      ["../../panels/superAdmin/pages/billing/SubscriptionPlans.jsx", "Subscription Plans"],
      ["../../panels/superAdmin/pages/billing/Subscriptions.jsx", "Subscriptions"],
      ["../../panels/superAdmin/pages/billing/InvoicesPayments.jsx", "Billing & Revenue"],
      ["../../panels/superAdmin/pages/account/PlatformStaff.jsx", "Platform Staff"],
    ];
    for (const [file, title] of pages) {
      const source = readSrc(file);
      assert.match(source, new RegExp(`<h1 className="platform-sr-only">${title}</h1>`));
      assert.doesNotMatch(source, new RegExp(`<h1>${title}</h1>`));
    }
    const plans = readSrc("../../panels/superAdmin/pages/billing/SubscriptionPlans.jsx");
    assert.match(plans, /id="plans-catalog-note"/);
    assert.match(plans, /Adding, editing, and deactivating plans is not available here/);
    assert.match(plans, /disabled aria-describedby="plans-catalog-note"/);
    assert.doesNotMatch(plans, /createPlan|updatePlan|deactivatePlan/);
  });
});

describe("profile phone code contract", () => {
  it("accepts an existing calling code and does not force a 10-digit phone number", () => {
    assert.deepEqual(profileFieldErrors({ phoneCode: "+91", phone: "12345" }), {});
    assert.match(profileFieldErrors({ phoneCode: "12345678901" }).phoneCode, /10/);
    assert.equal(profileFieldErrors({ phone: "123456789012345678901" }).phone.includes("20"), true);
  });
});
