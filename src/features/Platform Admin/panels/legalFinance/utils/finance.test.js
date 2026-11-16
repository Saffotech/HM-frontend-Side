import assert from "node:assert/strict";
import test from "node:test";
import { calcFinance, cycleSuffix, moneyEachCycle } from "./financeCalc.js";

test("annual contract value charges the catalog price once per year", () => {
  const result = calcFinance({
    std: 200000,
    disc: 0,
    yrs: 1,
    impl: 0,
    trn: 0,
    tax: 0,
    adv: 0,
    freq: "Annual",
  });
  assert.equal(result.pr, 200000);
  assert.equal(result.tot, 200000);
  assert.equal(cycleSuffix("Annual"), "/ yr");
  assert.match(moneyEachCycle(200000, "Annual"), /\/ yr$/);
});

test("monthly contract value repeats the monthly catalog price for each month in the duration", () => {
  const result = calcFinance({
    std: 20000,
    disc: 10,
    yrs: 2,
    impl: 5000,
    trn: 2000,
    tax: 18,
    adv: 25,
    freq: "Monthly",
  });
  assert.equal(result.pr, 18000);
  assert.equal(result.tot, 18000 * 12 * 2 + 5000 + 2000);
  assert.equal(result.gst, (18000 * 12 * 2 + 7000) * 0.18);
  assert.equal(result.adv, 4500);
  assert.equal(cycleSuffix("Monthly"), "/ mo");
});

test("quarterly and half-yearly totals follow the billing period", () => {
  const quarterly = calcFinance({
    std: 10000, disc: 0, yrs: 1, impl: 0, trn: 0, tax: 0, adv: 0, freq: "Quarterly",
  });
  const half = calcFinance({
    std: 10000, disc: 0, yrs: 1, impl: 0, trn: 0, tax: 0, adv: 0, freq: "Half-yearly",
  });
  assert.equal(quarterly.tot, 40000);
  assert.equal(half.tot, 20000);
});
