import { caseIsDecided } from "../../../shared/api/legalCaseModel";
import { useLegalFinance } from "../context/LegalFinanceContext";
import EditFinanceModal from "./EditFinanceModal";
import { caseFinance, durationLabel, formatRupees, moneyEachCycle, exceedsDiscountLimit } from "../utils/finance";
import { DISCOUNT_LIMIT } from "../constants";

export default function FinanceCard({ c }) {
  const { openModal, requestEscalation, decideEscalation } = useLegalFinance();
  const { f, k } = caseFinance(c);
  const over = exceedsDiscountLimit(c.disc);
  const blank = "\u00a0";
  const rows = c.empty
    ? [
      ["Plan", blank],
      ["Modules", blank],
      ["Contract duration", blank],
      ["Standard price", blank],
      ["Discount", blank],
      ["Proposed price", blank],
      ["Implementation fee", blank],
      ["Training fee", blank],
      ["Total contract value", blank],
      ["Payment", blank],
      ["Billing GSTIN", blank],
      ["PO required", blank],
      ["Invoice email", blank],
    ]
    : [
      ["Plan", c.plan || "—"],
      ["Modules", f.mod || "—"],
      ["Contract duration", durationLabel(f.yrs)],
      ["Standard price", moneyEachCycle(f.std, f.freq)],
      ["Discount", `${c.disc}% (limit: ${DISCOUNT_LIMIT}%)`],
      ["Proposed price", moneyEachCycle(k.pr, f.freq)],
      ["Implementation fee", formatRupees(f.impl)],
      ["Training fee", formatRupees(f.trn)],
      ["Total contract value", `${formatRupees(k.tot)} + ${f.tax}% tax (${formatRupees(k.gst)})`],
      ["Payment", `${f.freq} · ${f.adv}% advance · credit ${f.cr} days`],
      ["Billing GSTIN", f.gst || "—"],
      ["PO required", f.po || "—"],
      ["Invoice email", f.mail || "—"],
    ];
  return (
    <div className="card">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h2 style={{ margin: 0 }}>Finance &amp; commercial</h2>
        <button className="btn p" type="button" disabled={!c.id || caseIsDecided(c.st)} onClick={() => openModal(<EditFinanceModal caseId={c.id} />)}>Edit finance details</button>
      </div>
      <div className="g h2c">
        <div className="kv">{rows.map(([l, v]) => <div key={l}><span>{l}</span>{v}</div>)}</div>
        <div>
          {c.empty ? null : over ? (
            <>
              <div className="warn">Discount exceeds the 10% limit. Finance Head status: <b>{c.esc}</b></div>
              {c.esc === "Not requested" && (
                <button className="btn" type="button" onClick={() => requestEscalation(c.id)}>Request Finance Head approval</button>
              )}
              {c.esc === "Rejected" && <p className="mu">Save the finance terms again to request Finance Head approval.</p>}
              {c.esc === "Pending" && (
                <>
                  <button className="btn" type="button" onClick={() => decideEscalation(c.id, "Approved")}>Approve escalation</button>{" "}
                  <button className="btn d" type="button" onClick={() => decideEscalation(c.id, "Rejected")}>Reject escalation</button>
                </>
              )}
            </>
          ) : (
            <div className="inf">Discount within your approval limit.</div>
          )}
        </div>
      </div>
    </div>
  );
}
