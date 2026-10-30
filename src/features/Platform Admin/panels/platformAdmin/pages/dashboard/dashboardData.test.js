import assert from "assert";
import test from "node:test";
import { planSlices } from "../../sessionHospitals.js";
import { registrationGrowth } from "./dashboardData.js";

test("registration growth groups complete tenant dates into the six month window", () => {
  const now = new Date(2026, 9, 21, 12);
  const result = registrationGrowth([
    { created_at: "2026-05-02T12:00:00" },
    { created_at: "2026-10-03T12:00:00" },
    { created_at: "2026-10-18T12:00:00" },
    { created_at: "2026-03-01T12:00:00" },
  ], { now });

  assert.equal(result.ok, true);
  assert.equal(result.rows.length, 6);
  assert.deepEqual(result.rows.map((row) => row.tenants), [1, 0, 0, 0, 0, 2]);
});

test("registration growth rejects incomplete or invalid registration dates", () => {
  const now = new Date(2026, 9, 21, 12);
  assert.equal(registrationGrowth([{ name: "Missing date" }], { now }).ok, false);
  assert.equal(registrationGrowth([{ created_at: "not-a-date" }], { now }).ok, false);
});

test("registration growth reports an empty dataset without fabricating counts", () => {
  const result = registrationGrowth([], { now: new Date(2026, 9, 21, 12) });
  assert.equal(result.ok, true);
  assert.deepEqual(result.rows, []);
});

test("plan distribution groups actual plans and missing plan values", () => {
  assert.deepEqual(planSlices([
    { plan: "Starter" },
    { plan: "Starter" },
    { plan: " Growth " },
    {},
    null,
  ]), [
    { name: "Starter", value: 2 },
    { name: "Growth", value: 1 },
    { name: "Unassigned", value: 2 },
  ]);
  assert.deepEqual(planSlices(null), []);
});
