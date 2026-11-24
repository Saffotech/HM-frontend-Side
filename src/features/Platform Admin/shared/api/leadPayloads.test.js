import assert from "node:assert/strict";
import test from "node:test";
import { leadAgreeBody, leadCreateBody } from "./leadPayloads.js";

test("lead creation sends the hospital email with the other CRM fields", () => {
  const body = leadCreateBody({
    hospitalName: "City Care Hospital",
    type: "General",
    source: "Website",
    priority: "High",
    contactPerson: "Asha Rao",
    designation: "Director",
    phone: "9000000000",
    phoneCode: "+91",
    email: "asha@city.test",
    hospitalEmail: "desk@city.test",
    city: "Pune",
    state: "Maharashtra",
    plan: "Professional",
    billingCycle: "Monthly",
    message: "Need OPD and IPD.",
  });
  assert.equal(body.hospital_email, "desk@city.test");
  assert.equal(body.hospital_name, "City Care Hospital");
  assert.equal(body.contact_email, "asha@city.test");
  assert.equal(body.billing_cycle, "Monthly");
  assert.equal(body.shared, false);
  assert.equal(leadCreateBody({
    hospitalName: "Shared Care",
    source: "Website",
    contactPerson: "Asha",
    phone: "9000000001",
    city: "Pune",
    hospitalEmail: "shared@city.test",
  }, { shared: true }).shared, true);
});

test("agreement sends plan, billing cycle, hospital email, and handover note", () => {
  assert.deepEqual(leadAgreeBody({
    plan: "Professional",
    billingCycle: "Monthly",
    hospitalEmail: "desk@city.test",
    note: "Bill the admin office.",
  }), {
    plan: "Professional",
    billing_cycle: "Monthly",
    hospital_email: "desk@city.test",
    note: "Bill the admin office.",
  });
});
