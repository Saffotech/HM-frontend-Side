import { useLegalFinance } from "../context/LegalFinanceContext";
import CaseSelector from "../components/CaseSelector";
import CaseBanner from "../components/CaseBanner";
import DocsCard from "../components/DocsCard";
import ChecklistCard from "../components/ChecklistCard";
import DecisionCard from "../components/DecisionCard";
import { emptyLegalCase } from "../utils/emptyCase";

export default function LegalDocs() {
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
  const c = current || emptyLegalCase();
  return (
    <>
      <div className="row">
        <CaseSelector />
      </div>
      <CaseBanner c={c} />
      <DocsCard c={c} />
      <ChecklistCard c={c} />
      <DecisionCard c={c} />
    </>
  );
}
