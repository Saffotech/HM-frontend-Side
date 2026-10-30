import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { executePlatformRequest } from "./platformHttp.js";
import { PlatformApiError } from "./platformErrors.js";
import { createPlatformAuthStore } from "./platformSession.js";
import {
  PLATFORM_STAFF_ROLES,
  createSubmitGuard,
  interpretStaffError,
  platformStaffBody,
  staffCreatedNotice,
  validatePlatformStaff,
} from "./platformStaff.js";

const valid = {
  firstName: " Meera ",
  lastName: " Iyer ",
  email: " Meera@Example.com ",
  password: "Secret123",
  role: "crm",
};

function memoryStorage() {
  const store = new Map();
  return {
    store,
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
  };
}

function mockFetch(route) {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    if (route.networkError) throw new Error("offline");
    return {
      status: route.status,
      ok: route.status >= 200 && route.status < 300,
      json: async () => route.body ?? {},
    };
  };
  return { calls, fetchImpl };
}

function readSrc(relativePath) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

describe("platform staff validation", () => {
  it("requires first name, email, password, and a platform role", () => {
    const errors = validatePlatformStaff({
      firstName: " ",
      lastName: "",
      email: "",
      password: "",
      role: "",
    });
    assert.equal(errors.firstName, "First name is required.");
    assert.equal(errors.email, "Email is required.");
    assert.equal(errors.password, "Password is required.");
    assert.equal(errors.role, "Choose CRM or Accountant.");
    assert.equal(errors.lastName, undefined);
  });

  it("rejects an invalid email and a password outside 8–128 characters", () => {
    const shortPassword = validatePlatformStaff({ ...valid, email: "meera", password: "short" });
    assert.equal(shortPassword.email, "Enter a valid email address.");
    assert.equal(shortPassword.password, "Password must be at least 8 characters.");

    const longPassword = validatePlatformStaff({ ...valid, password: "a".repeat(129) });
    assert.equal(longPassword.password, "Password must be 128 characters or fewer.");
    assert.equal(validatePlatformStaff({ ...valid, firstName: "A".repeat(101) }).firstName, "First name must be 100 characters or fewer.");
    assert.equal(validatePlatformStaff({ ...valid, lastName: "B".repeat(101) }).lastName, "Last name must be 100 characters or fewer.");
  });

  it("accepts only CRM and Accountant", () => {
    assert.deepEqual(PLATFORM_STAFF_ROLES.map((role) => role.value), ["crm", "accountant"]);
    assert.deepEqual(validatePlatformStaff(valid), {});
    assert.deepEqual(validatePlatformStaff({ ...valid, role: "accountant", lastName: "" }), {});
    ["platform_admin", "admin", "doctor", "nurse", "manager"].forEach((role) => {
      assert.equal(validatePlatformStaff({ ...valid, role }).role, "Choose CRM or Accountant.");
    });
  });
});

describe("platform staff request", () => {
  it("posts only the staff fields to /platform/staff with the platform bearer token", async () => {
    const body = platformStaffBody(valid);
    assert.deepEqual(body, {
      first_name: "Meera",
      last_name: "Iyer",
      email: "meera@example.com",
      password: "Secret123",
      role: "crm",
    });
    ["tenant_id", "role_id", "hospital", "hospital_id"].forEach((key) => {
      assert.equal(Object.hasOwn(body, key), false);
    });

    const auth = createPlatformAuthStore(memoryStorage());
    auth.saveSession({
      accessToken: "platform-access",
      refreshToken: "refresh-1",
      user: { userId: 3, role: "platform_admin", tenantId: null },
    });
    const created = {
      message: "Staff created successfully",
      user_id: 41,
      first_name: "Meera",
      last_name: "Iyer",
      email: "meera@example.com",
      role: "crm",
      tenant_id: null,
      is_active: true,
    };
    const { calls, fetchImpl } = mockFetch({ status: 201, body: created });
    const response = await executePlatformRequest("/platform/staff", {
      method: "POST",
      body: JSON.stringify(body),
    }, { origin: "http://127.0.0.1:8000", auth, fetchImpl });

    assert.equal(calls[0].url, "http://127.0.0.1:8000/platform/staff");
    assert.equal(calls[0].options.method, "POST");
    assert.equal(calls[0].options.headers.Authorization, "Bearer platform-access");
    assert.deepEqual(JSON.parse(calls[0].options.body), body);
    assert.equal(response.user_id, 41);
    const notice = staffCreatedNotice(response);
    assert.equal(notice.email, "meera@example.com");
    assert.equal(notice.role, "crm");
    assert.equal(Object.hasOwn(notice, "password"), false);
  });

  it("does not treat a body without a user id as a created account", () => {
    assert.equal(staffCreatedNotice({ message: "Staff created successfully" }), null);
    assert.equal(staffCreatedNotice(null), null);
  });

  it("reports 401, 403, 409, and 422 without treating them as success", async () => {
    const auth = createPlatformAuthStore(memoryStorage());
    auth.saveSession({
      accessToken: "platform-access",
      refreshToken: "refresh-1",
      user: { userId: 3, role: "platform_admin", tenantId: null },
    });

    const denied = mockFetch({ status: 403, body: { detail: "Only a platform admin can create platform staff" } });
    await assert.rejects(
      () => executePlatformRequest("/platform/staff", { method: "POST", body: "{}" }, { origin: "http://platform.test", auth, fetchImpl: denied.fetchImpl }),
      (error) => {
        const result = interpretStaffError(error);
        assert.equal(error.status, 403);
        assert.equal(result.toast, "Only a platform admin can create platform staff");
        assert.equal(result.unauthenticated, false);
        assert.equal(result.retryable, false);
        return true;
      },
    );

    const expired = mockFetch({ status: 401, body: { detail: "Could not validate credentials" } });
    await assert.rejects(
      () => executePlatformRequest("/platform/staff", {
        method: "POST",
        body: "{}",
        skipRefresh: true,
      }, { origin: "http://platform.test", auth, fetchImpl: expired.fetchImpl }),
      (error) => {
        const result = interpretStaffError(error);
        assert.equal(result.unauthenticated, true);
        assert.equal(error instanceof PlatformApiError, true);
        return true;
      },
    );

    const duplicate = mockFetch({ status: 409, body: { detail: "Email already registered" } });
    await assert.rejects(
      () => executePlatformRequest("/platform/staff", { method: "POST", body: "{}" }, { origin: "http://platform.test", auth, fetchImpl: duplicate.fetchImpl }),
      (error) => {
        const result = interpretStaffError(error);
        assert.equal(result.toast, "This email is already registered.");
        assert.equal(result.fieldErrors.email, "This email is already registered.");
        return true;
      },
    );

    const invalid = mockFetch({
      status: 422,
      body: { detail: [{ loc: ["body", "email"], msg: "value is not a valid email address" }] },
    });
    await assert.rejects(
      () => executePlatformRequest("/platform/staff", { method: "POST", body: "{}" }, { origin: "http://platform.test", auth, fetchImpl: invalid.fetchImpl }),
      (error) => {
        const result = interpretStaffError(error);
        assert.equal(result.fieldErrors.email, "value is not a valid email address");
        assert.equal(result.retryable, false);
        return true;
      },
    );
  });

  it("marks network and server failures as retryable and does not retry them automatically", async () => {
    const auth = createPlatformAuthStore(memoryStorage());
    auth.saveSession({
      accessToken: "platform-access",
      refreshToken: "refresh-1",
      user: { userId: 3, role: "platform_admin", tenantId: null },
    });
    const offline = mockFetch({ networkError: true });
    await assert.rejects(
      () => executePlatformRequest("/platform/staff", { method: "POST", body: "{}" }, { origin: "http://platform.test", auth, fetchImpl: offline.fetchImpl }),
      (error) => {
        assert.equal(interpretStaffError(error).retryable, true);
        assert.equal(offline.calls.length, 1);
        return true;
      },
    );

    const server = mockFetch({ status: 500, body: { detail: "Internal Server Error" } });
    await assert.rejects(
      () => executePlatformRequest("/platform/staff", { method: "POST", body: "{}" }, { origin: "http://platform.test", auth, fetchImpl: server.fetchImpl }),
      (error) => interpretStaffError(error).retryable === true && server.calls.length === 1,
    );
  });

  it("blocks a second submit while the first is still running", () => {
    const guard = createSubmitGuard();
    assert.equal(guard.tryStart(), true);
    assert.equal(guard.tryStart(), false);
    guard.finish();
    assert.equal(guard.tryStart(), true);
  });
});

describe("platform staff page wiring", () => {
  it("keeps registration on the platform admin route and does not persist the password", () => {
    const page = readSrc("../../panels/platformAdmin/pages/account/PlatformStaff.jsx");
    const api = readSrc("./platformStaffApi.js");
    const routes = readSrc("../../panels/platformAdmin/PlatformAdminRoutes.jsx");
    const sidebar = readSrc("../../panels/platformAdmin/layout/Sidebar.jsx");
    const crm = readSrc("../../panels/crm/CrmRoutes.jsx");
    const accountant = readSrc("../../panels/accountant/AccountantRoutes.jsx");

    assert.match(routes, /path="staff"/);
    assert.match(sidebar, /Platform Staff/);
    assert.match(page, /createPlatformStaff/);
    assert.match(api, /platformApi\("\/platform\/staff"/);
    assert.doesNotMatch(page, /apiClient|localStorage|sessionStorage|console\./);
    assert.doesNotMatch(api, /localStorage|sessionStorage|console\./);
    assert.doesNotMatch(page, /tenant_id|role_id|hospital_id/);
    assert.doesNotMatch(crm, /PlatformStaff|\/platform\/staff/);
    assert.doesNotMatch(accountant, /PlatformStaff|\/platform\/staff/);
  });
});
