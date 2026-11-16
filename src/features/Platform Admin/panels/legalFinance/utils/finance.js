import { DISCOUNT_LIMIT } from "../constants";
import { EMPTY_FINANCE, financeFormFromCase, wholeRupees } from "../../../shared/api/legalCaseModel";
import {
  calcFinance,
  cycleSuffix,
  cycleUnit,
  durationLabel,
  formatRupees,
  moneyEachCycle,
} from "./financeCalc";

export { EMPTY_FINANCE as DEFAULT_FINANCE };
export {
  calcFinance,
  cycleSuffix,
  cycleUnit,
  durationLabel,
  formatRupees,
  moneyEachCycle,
};

export const getFinance = (caseRow) => financeFormFromCase(caseRow);

export const caseFinance = (caseRow) => {
  const form = getFinance(caseRow);
  return { f: form, k: calcFinance(form) };
};

export const fmtLakh = formatRupees;

export const isInvalidFinance = (values) => {
  const amounts = [values.std, values.impl, values.trn, values.tax, values.adv, values.cr, values.disc, values.yrs];
  if (amounts.some((amount) => wholeRupees(amount) == null)) return true;
  return values.disc < 0
    || values.disc > 100
    || values.adv > 100
    || values.tax > 100
    || values.yrs < 1
    || values.yrs > 10
    || values.cr > 365
    || values.std < 0
    || values.impl < 0
    || values.trn < 0;
};

export const exceedsDiscountLimit = (discount) => Number(discount) > DISCOUNT_LIMIT;
