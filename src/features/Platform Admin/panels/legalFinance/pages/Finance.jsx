import { useLegalFinance } from "../context/LegalFinanceContext";
import EditFinanceModal from "../components/EditFinanceModal";
import StatusBadge from "../components/StatusBadge";
import CaseSelector from "../components/CaseSelector";
import CaseBanner from "../components/CaseBanner";
import FinanceCard from "../components/FinanceCard";
import FinanceRecords from "../components/FinanceRecords";
import DecisionCard from "../components/DecisionCard";
import { caseIsDecided } from "../../../shared/api/legalCaseModel";
import { isFinanceDone, discountCleared } from "../utils/caseHelpers";
import { emptyLegalCase } from "../utils/emptyCase";

export default function Finance() {
  const { loading, loadError, current, reloadCases, openModal } = useLegalFinance();
  if (loading) return <div className="card"><p className="mu">Loading cases…</p></div>;
  if (loadError) {
    return (
      <div className="card">
        <div className="err" role="alert">{loadError}</div>
        <button className="btn" type="button" onClick={reloadCases}>Try again</button>
      </div>
    );
  }
  return <FinanceCase c={current || emptyLegalCase()} openModal={openModal} />;
}

function FinanceCase({ c, openModal }) {
  const ok = discountCleared(c);
  return (
    <>
      <div className="row">
        {c.id && <StatusBadge status={isFinanceDone(c) ? "Done" : "Pending"} />}
        <span style={{ marginLeft: "auto" }}><CaseSelector /></span>
      </div>
      {c.id && <p className="mu">{c.h} · {c.id} · CRM lead {c.lead}</p>}
      <CaseBanner c={c} />
      <FinanceCard c={c} />
      <div className="card">
        <h2>Finance records</h2>
        <FinanceRecords c={c} />
        <p className="mu">Payment status comes from the Accounts record, not from approval.</p>
      </div>
      <div className="card">
        <button className="btn p" type="button" disabled={!c.id || c.fr || !ok || caseIsDecided(c.st)} onClick={() => openModal(<EditFinanceModal caseId={c.id} />)}>{c.fr ? "Finance review recorded" : "Mark finance review done"}</button>{" "}
        {!ok && <span className="mu">Discount escalation must be approved first.</span>}
      </div>
      <DecisionCard c={c} />
    </>
  );
}
