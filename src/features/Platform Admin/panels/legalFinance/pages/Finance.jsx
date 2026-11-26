import { useLegalFinance } from "../context/LegalFinanceContext";
import CaseSelector from "../components/CaseSelector";
import CaseBanner from "../components/CaseBanner";
import FinanceCard from "../components/FinanceCard";
import HospitalCrmInfo from "../components/HospitalCrmInfo";
import FinanceRecords from "../components/FinanceRecords";
import DecisionCard from "../components/DecisionCard";
import { emptyLegalCase } from "../utils/emptyCase";
import { STATUS_TONE, TONE_ICON } from "../utils/status";

export default function Finance() {
  const { loading, loadError, current, reloadCases } = useLegalFinance();
  if (loading) return <div className="card"><p className="mu">Loading cases…</p></div>;
  if (loadError) {
    return (
      <div className="card">
        <div className="err" role="alert">{loadError}</div>
        <button className="btn" type="button" onClick={reloadCases}>Try again</button>
      </div>
    );
  }
  return <FinanceCase c={current || emptyLegalCase()} />;
}

function FinanceCase({ c }) {
  return (
    <>
      <div className="row lf-case-head">
        {c.id ? (
          <div className="lf-case-meta">
            <span className={`bd s-${STATUS_TONE[c.st] || "mu"} lf-case-decision`}>{TONE_ICON[STATUS_TONE[c.st] || "mu"]} Decision: {c.st}</span>
          </div>
        ) : null}
        <span style={{ marginLeft: "auto" }}><CaseSelector /></span>
      </div>
      {c.st === "Changes Requested" ? <CaseBanner c={c} /> : null}
      {c.id ? <HospitalCrmInfo c={c} /> : null}
      <FinanceCard c={c} />
      <div className="card">
        <h2>Saved pricing records</h2>
        <FinanceRecords c={c} />
      </div>
      <DecisionCard c={c} />
    </>
  );
}
