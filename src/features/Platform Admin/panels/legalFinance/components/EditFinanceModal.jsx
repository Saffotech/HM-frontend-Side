import { useState } from "react";
import { useLegalFinance } from "../context/LegalFinanceContext";
import { FREQUENCIES } from "../../../shared/api/legalCaseModel";
import { getFinance, calcFinance, cycleSuffix, cycleUnit, formatRupees, financeFieldErrors } from "../utils/finance";
import { DISCOUNT_LIMIT } from "../constants";

function FinanceField({ id, label, error, children }) {
  return (
    <div className={error ? "lf-field is-invalid" : "lf-field"}>
      <label htmlFor={`lf-fin-${id}`}>{label}</label>
      {children}
      {error ? <p className="lf-field-error">{error}</p> : null}
    </div>
  );
}

export default function EditFinanceModal({ caseId }) {
  const { cases, saveFinance, closeModal, toast } = useLegalFinance();
  const c = cases.find((x) => x.id === caseId);
  const agreedCycle = FREQUENCIES.includes(c?.crm?.billingCycle) ? c.crm.billingCycle : "";
  const [v, setV] = useState(() => (c ? { ...getFinance(c), disc: c.disc, plan: c.plan || "" } : { disc: 0, plan: "" }));
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  if (!c) return null;

  const set = (key) => (e) => {
    const value = e.target.value;
    setV((s) => ({ ...s, [key]: value }));
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const num = { ...v, std: +v.std, disc: +v.disc, yrs: +v.yrs, impl: +v.impl, trn: +v.trn, tax: +v.tax, adv: +v.adv, cr: +v.cr };
  const clientErrors = financeFieldErrors(num);
  const bad = Object.keys(clientErrors).length > 0;
  const k = calcFinance(num);

  const save = async () => {
    if (busy) return;
    if (bad) {
      setErrors(clientErrors);
      toast("Check the highlighted fields.", true);
      return;
    }
    setBusy(true);
    const result = await saveFinance(caseId, num);
    setBusy(false);
    if (result?.ok) {
      closeModal();
      return;
    }
    if (result?.fieldErrors && Object.keys(result.fieldErrors).length) {
      setErrors(result.fieldErrors);
    }
  };

  return (
    <>
      <h2>Edit finance details · {c.h}</h2>
      <div className="g h2c">
        <FinanceField id="yrs" label="Subscription Period (years)" error={errors.yrs}>
          <input id="lf-fin-yrs" type="number" min="0" step="1" value={v.yrs} onChange={set("yrs")} aria-invalid={Boolean(errors.yrs)} />
        </FinanceField>
        <FinanceField id="std" label={`Regular Subscription Price (₹ per ${cycleUnit(v.freq)})`} error={errors.std}>
          <input id="lf-fin-std" type="number" min="0" step="1" value={v.std} onChange={set("std")} aria-invalid={Boolean(errors.std)} />
        </FinanceField>
        <FinanceField id="disc" label="Discount Offered (%)" error={errors.disc}>
          <input id="lf-fin-disc" type="number" min="0" step="1" value={v.disc} onChange={set("disc")} aria-invalid={Boolean(errors.disc)} />
        </FinanceField>
        <FinanceField id="impl" label="One-Time Setup Fee (₹)" error={errors.impl}>
          <input id="lf-fin-impl" type="number" min="0" step="1" value={v.impl} onChange={set("impl")} aria-invalid={Boolean(errors.impl)} />
        </FinanceField>
        <FinanceField id="trn" label="Staff Training Fee (₹)" error={errors.trn}>
          <input id="lf-fin-trn" type="number" min="0" step="1" value={v.trn} onChange={set("trn")} aria-invalid={Boolean(errors.trn)} />
        </FinanceField>
        <FinanceField id="tax" label="Tax (%)" error={errors.tax}>
          <input id="lf-fin-tax" type="number" min="0" step="1" value={v.tax} onChange={set("tax")} aria-invalid={Boolean(errors.tax)} />
        </FinanceField>
        <FinanceField id="freq" label="Payment Terms" error={errors.freq}>
          <select id="lf-fin-freq" value={agreedCycle || v.freq} onChange={set("freq")} disabled={Boolean(agreedCycle)} aria-invalid={Boolean(errors.freq)}>
            <option value="Annual">Annual</option>
            <option value="Half-yearly">Half-yearly</option>
            <option value="Quarterly">Quarterly</option>
            <option value="Monthly">Monthly</option>
          </select>
        </FinanceField>
        <FinanceField id="cr" label="Payment Due (days)" error={errors.cr}>
          <input id="lf-fin-cr" type="number" min="0" step="1" value={v.cr} onChange={set("cr")} aria-invalid={Boolean(errors.cr)} />
        </FinanceField>
      </div>
      <div className="inf" style={{ marginTop: 10 }}>
        {bad ? (
          "Enter whole rupees. Discount and tax are 0–100."
        ) : (
          <>
            Price after discount <b>{formatRupees(k.pr)}</b> {cycleSuffix(v.freq)} · Subtotal <b>{formatRupees(k.tot)}</b> · Tax {formatRupees(k.gst)} · Total payable <b>{formatRupees(Number(k.tot) + Number(k.gst))}</b>
            {num.disc > DISCOUNT_LIMIT && <><br /><b>Discount above {DISCOUNT_LIMIT}%: escalation becomes Not requested unless it is already Pending or Approved.</b></>}
          </>
        )}
      </div>
      <div className="warn">Amounts are whole rupees. Saving a discount above {DISCOUNT_LIMIT}% does not replace a Pending or Approved escalation.</div>
      <div className="row" style={{ justifyContent: "flex-end", margin: 0 }}>
        <button className="btn" onClick={closeModal}>Cancel</button>
        <button className="btn p" type="button" disabled={busy} onClick={save}>{busy ? "Saving…" : "Save changes"}</button>
      </div>
    </>
  );
}
