/** How many times the billing-period price is charged in one contract year. */
const PERIODS_PER_YEAR = {
  Annual: 1,
  "Half-yearly": 2,
  Quarterly: 4,
  Monthly: 12,
};

const CYCLE_SUFFIX = {
  Annual: "/ yr",
  Monthly: "/ mo",
  Quarterly: "/ qtr",
  "Half-yearly": "/ half-yr",
};

const CYCLE_UNIT = {
  Annual: "year",
  Monthly: "month",
  Quarterly: "quarter",
  "Half-yearly": "half-year",
};

export const cycleSuffix = (frequency) => CYCLE_SUFFIX[frequency] || "/ yr";

export const cycleUnit = (frequency) => CYCLE_UNIT[frequency] || "year";

export const durationLabel = (years) => {
  const count = Number(years);
  if (!Number.isFinite(count)) return "—";
  return `${count} ${count === 1 ? "year" : "years"}`;
};

export const formatRupees = (amount) => {
  const value = Number(amount);
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Math.round(value));
};

export const moneyEachCycle = (amount, frequency) => `${formatRupees(amount)} ${cycleSuffix(frequency)}`;

/** `std` is the catalog charge for one billing period, the same amount `price_for` stores. */
export const calcFinance = (values) => {
  const price = (Number(values.std) * (100 - Number(values.disc))) / 100;
  const periods = PERIODS_PER_YEAR[values.freq] ?? 1;
  const total = price * periods * Number(values.yrs) + Number(values.impl) + Number(values.trn);
  return {
    pr: price,
    tot: total,
    gst: (total * Number(values.tax)) / 100,
    adv: (price * Number(values.adv)) / 100,
  };
};
