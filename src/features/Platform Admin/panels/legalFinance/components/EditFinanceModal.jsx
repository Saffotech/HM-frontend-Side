import { useState } from "react";
import { useLegalFinance } from "../context/LegalFinanceContext";
import { getFinance, calcFinance, formatRupees, isInvalidFinance } from "../utils/finance";
import { DISCOUNT_LIMIT } from "../constants";

export default function EditFinanceModal({ caseId }) {
  const { cases, saveFinance, closeModal, toast } = useLegalFinance();
  const c = cases.find((x) => x.id === caseId);
  const [v, setV] = useState(() => (c ? { ...getFinance(c), disc: c.disc } : { disc: 0 }));
  const [busy, setBusy] = useState(false);
  if (!c) return null;
  const set = (key) => (e) => setV((s) => ({ ...s, [key]: e.target.value }));

  // numeric view of the form for validation / preview
  const num = { ...v, std: +v.std, disc: +v.disc, yrs: +v.yrs, impl: +v.impl, trn: +v.trn, tax: +v.tax, adv: +v.adv, cr: +v.cr };
  const bad = isInvalidFinance(num);
  const k = calcFinance(num);

  const Num = (key, label) => (
    <div><label>{label}</label><input type="number" min="0" step="1" value={v[key]} onChange={set(key)} /></div>
  );
  const Txt = (key, label) => (
    <div><label>{label}</label><input value={v[key]} onChange={set(key)} /></div>
  );
  const Sel = (key, label, opts) => (
    <div><label>{label}</label><select value={v[key]} onChange={set(key)}>{opts.map((o) => <option key={o}>{o}</option>)}</select></div>
  );

  const save = async () => {
    if (busy) return;
    if (bad) return toast("Enter whole rupees. Discount is required.", true);
    setBusy(true);
    const saved = await saveFinance(caseId, num);
    setBusy(false);
    if (saved) closeModal();
  };

  return (
    <>
      <h2>Edit finance details · {c.h}</h2>
      <div className="g h2c">
        {Txt("mod", "Modules")}
        {Num("yrs", "Duration (years)")}
        {Num("std", "Standard price (₹ / yr)")}
        {Num("disc", "Discount %")}
        {Num("impl", "Implementation fee (₹)")}
        {Num("trn", "Training fee (₹)")}
        {Num("tax", "Tax %")}
        {Sel("freq", "Payment frequency", ["Annual", "Half-yearly", "Quarterly", "Monthly"])}
        {Num("adv", "Advance payment %")}
        {Num("cr", "Credit period (days)")}
        {Txt("gst", "Billing GSTIN")}
        {Sel("po", "PO required", ["Yes", "No"])}
      </div>
      {Txt("mail", "Invoice email")}
      <div className="inf" style={{ marginTop: 10 }}>
        {bad ? (
          "Enter whole rupees. Discount, tax, and advance are 0–100."
        ) : (
          <>
            Proposed price <b>{formatRupees(k.pr)}</b> / yr · Total <b>{formatRupees(k.tot)}</b> + tax {formatRupees(k.gst)} · Advance {formatRupees(k.adv)}
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
