import { caseIsDecided } from "../../../shared/api/legalCaseModel";
import { useLegalFinance } from "../context/LegalFinanceContext";
import EditFinanceModal from "./EditFinanceModal";
import {
  billingSource,
  caseFinance,
  catalogTerm,
  creditLabel,
  discountAmount,
  displayText,
  formatRupees,
  manualTerm,
  moneyEachCycle,
  payableTotal,
  subscriptionPeriod,
  exceedsDiscountLimit,
} from "../utils/finance";

function Fact({ label, value }) {
  return (
    <div className="lf-price-fact">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Line({ label, value }) {
  return (
    <div className="lf-price-line">
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}

export default function FinanceCard({ c }) {
  const { openModal, requestEscalation, decideEscalation } = useLegalFinance();
  const { f, k } = caseFinance(c);
  const over = exceedsDiscountLimit(c.disc);
  const empty = Boolean(c.empty);
  const discAmt = discountAmount(f, k);
  const payable = payableTotal(k);
  const showReviewed = Boolean(c.fr || c.commercialChange);
  const source = billingSource(c);

  return (
    <div className="card lf-pricing">
      <div className="lf-pricing-head">
        <div>
          <h2>Pricing &amp; Payment Details</h2>
          <p>Subscription, charges and billing for this hospital.</p>
        </div>
        <button
          className="btn p"
          type="button"
          disabled={!c.id || caseIsDecided(c.st)}
          onClick={() => openModal(<EditFinanceModal caseId={c.id} />)}
        >
          Edit finance details
        </button>
      </div>

      <div className="lf-pricing-grid">
        <section className="lf-pricing-block">
          <h3>Subscription &amp; Plan</h3>
          <div className="lf-price-facts">
            <Fact label="Selected Plan" value={empty ? "Not Provided" : displayText(c.plan)} />
            <Fact label="Subscription Period" value={manualTerm(c, subscriptionPeriod(f.yrs))} />
          </div>
          {source ? <p className="mu lf-crm-caption">{source}</p> : null}
          <h3 className="lf-pricing-next">Payment &amp; Billing Information</h3>
          <div className="lf-price-facts">
            <Fact
              label="Payment Terms"
              value={empty ? "Not Provided" : (f.freq || "Not Set")}
            />
            <Fact
              label="Payment Due"
              value={manualTerm(c, creditLabel(f.cr))}
            />
          </div>
        </section>

        <section className="lf-pricing-block lf-pricing-block--breakdown">
          <h3>Price Breakdown</h3>
          {empty ? (
            <p className="mu">Not Provided</p>
          ) : (
            <>
              <Line label="Catalog Standard Price" value={catalogTerm(c, moneyEachCycle(f.std, f.freq))} />
              <Line label={showReviewed ? `Discount Offered (${Number(c.disc) || 0}%)` : "Discount Offered"} value={manualTerm(c, formatRupees(discAmt))} />
              <Line label="Price After Discount" value={manualTerm(c, moneyEachCycle(k.pr, f.freq))} />
              <Line label="One-Time Setup Fee" value={manualTerm(c, formatRupees(f.impl))} />
              <Line label="Staff Training Fee" value={manualTerm(c, formatRupees(f.trn))} />
              <Line label="Subtotal" value={manualTerm(c, formatRupees(k.tot))} />
              <Line label={showReviewed ? `Tax (${Number(f.tax) || 0}%)` : "Tax"} value={manualTerm(c, formatRupees(k.gst))} />
              <div className="lf-price-total">
                <span>Total Amount Payable</span>
                <strong>{manualTerm(c, formatRupees(payable))}</strong>
              </div>
            </>
          )}
        </section>
      </div>

      {c.commercialChange ? <div className="lf-review-banner">{c.commercialChange}</div> : null}
      {c.empty ? null : !c.fr && !c.commercialChange ? (
        <div className="inf">Catalog price and billing cycle came from CRM. Contract length, discount, fees, tax, and invoice details stay Not Set until Legal &amp; Finance reviews them.</div>
      ) : over ? (
        <div className="lf-pricing-note">
          <div className="warn">Discount exceeds the 10% limit. Finance Head status: <b>{c.esc}</b></div>
          {c.esc === "Not requested" && (
            <button className="btn" type="button" onClick={() => requestEscalation(c.id)}>Request Finance Head approval</button>
          )}
          {c.esc === "Rejected" && <p className="mu">Save the finance terms again to request Finance Head approval.</p>}
          {c.esc === "Pending" && (
            <div className="row">
              <button className="btn" type="button" onClick={() => decideEscalation(c.id, "Approved")}>Approve escalation</button>
              <button className="btn d" type="button" onClick={() => decideEscalation(c.id, "Rejected")}>Reject escalation</button>
            </div>
          )}
        </div>
      ) : (
        <div className="inf">Discount is within your approval limit.</div>
      )}
    </div>
  );
}
