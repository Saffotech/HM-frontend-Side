import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_PHONE_CODE,
  parsePhoneNumber,
  parseProfilePhone,
  phoneInputIssue,
  serializePhoneNumber,
  validPhoneForCode,
  PHONE_COUNTRY_CODES,
} from "./phoneNumbers.js";

test("Indian numbers require exactly ten digits and serialize without changing the API value", () => {
  assert.equal(validPhoneForCode("9876543210", DEFAULT_PHONE_CODE), true);
  assert.equal(validPhoneForCode("987654321", DEFAULT_PHONE_CODE), false);
  assert.equal(validPhoneForCode("98765432101", DEFAULT_PHONE_CODE), false);
  assert.equal(serializePhoneNumber("9876543210", DEFAULT_PHONE_CODE), "9876543210");
});

test("international saved numbers split their calling code without duplicating it", () => {
  assert.deepEqual(parsePhoneNumber("+1 4155550132"), { phoneCode: "+1", phone: "4155550132" });
  assert.deepEqual(parsePhoneNumber("+91 9876543210"), { phoneCode: "+91", phone: "9876543210" });
  assert.deepEqual(parsePhoneNumber("0091 9876543210"), { phoneCode: "+91", phone: "9876543210" });
  assert.equal(serializePhoneNumber("4155550132", "+1"), "+1 4155550132");
  assert.deepEqual(parsePhoneNumber("9876543210", "+1"), { phoneCode: "+1", phone: "9876543210" });
  assert.deepEqual(parsePhoneNumber("9123456780"), { phoneCode: "+91", phone: "9123456780" });
  assert.deepEqual(parseProfilePhone("19123456789012345", "+1"), { phoneCode: "+1", phone: "19123456789012345" });
  assert.deepEqual(parseProfilePhone("+1 4155550132", ""), { phoneCode: "+1", phone: "4155550132" });
});

test("typing and paste drafts reject non-digits and over-limit values without truncating", () => {
  assert.equal(phoneInputIssue("9876543210", 10), "");
  assert.equal(phoneInputIssue("98765432101", 10), "Use no more than 10 digits.");
  assert.equal(phoneInputIssue("987 543210", 10), "Use digits only.");
  assert.equal(phoneInputIssue("98765x3210", 10), "Use digits only.");
});

test("international numbers fit the backend 10-to-15 digit rule", () => {
  assert.equal(validPhoneForCode("4155550132", "+1"), true);
  assert.equal(validPhoneForCode("123", "+1"), false);
  assert.equal(validPhoneForCode("", "+1", { optional: true }), true);
});

test("country options have unique countries while retaining the US and Canada +1 entries", () => {
  const countryCodes = PHONE_COUNTRY_CODES.map(([, iso]) => iso);
  assert.equal(new Set(countryCodes).size, countryCodes.length);
  assert.deepEqual(PHONE_COUNTRY_CODES.filter(([callingCode]) => callingCode === "+1").map(([, iso]) => iso), ["US", "CA"]);
  assert.deepEqual(PHONE_COUNTRY_CODES[0], ["+91", "IN", "India"]);
});
