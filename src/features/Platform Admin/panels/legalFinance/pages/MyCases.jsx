import { useState } from "react";
import { useLegalFinance } from "../context/LegalFinanceContext";
import StatusBadge from "../components/StatusBadge";
import StageLink from "../components/StageLink";
import CaseDetailModal from "../components/CaseDetailModal";
import { STATUS_GROUPS } from "../utils/status";
import { docsVerified, isLegalDone, isFinanceDone } from "../utils/caseHelpers";
import Clip from "../components/Clip";

export default function MyCases() {
  const { cases, ws, openModal, loading, loadError, reloadCases } = useLegalFinance();
  const [tab, setTab] = useState("All");
  const tabs = ["All", ...Object.keys(STATUS_GROUPS)];
  const count = (t) => (t === "All" ? cases.length : cases.filter((x) => STATUS_GROUPS[t].includes(x.st)).length);
  const rows = cases.filter((x) => tab === "All" || STATUS_GROUPS[tab].includes(x.st));
  const details = (id) => openModal(<CaseDetailModal caseId={id} />, { wide: true });

  return (
    <>
      <div className="row">
        {tabs.map((t) => (
          <button key={t} className={"btn " + (tab === t ? "p" : "")} onClick={() => setTab(t)}>{t} ({count(t)})</button>
        ))}
      </div>
      <div className="card tw">
        <table className="lf-fixed lf-hosp">
          <colgroup>
            <col className="c-id" /><col className="c-name" /><col className="c-city" /><col className="c-plan" />
            <col className="c-legal" /><col className="c-fin" /><col className="c-st" />
          </colgroup>
          <thead>
            <tr><th>Case</th><th>{ws.nm}</th><th>City</th><th>Plan</th><th>Legal docs</th><th>Finance</th><th>Status</th></tr>
          </thead>
          <tbody>
            {rows.map((x) => (
              <tr
                key={x.id}
                className="lf-row"
                tabIndex={0}
                onClick={() => details(x.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") details(x.id);
                }}
              >
                <td><Clip>{x.id}</Clip></td>
                <td><Clip className="l">{x.h}</Clip></td>
                <td><Clip>{x.city}</Clip></td>
                <td><Clip>{x.plan}</Clip></td>
                <td><StageLink done={isLegalDone(x)} section="legal" caseId={x.id} /> <span className="mu">{docsVerified(x)}/{x.docs.length} docs</span></td>
                <td><StageLink done={isFinanceDone(x)} section="finance" caseId={x.id} /> <span className="mu">{x.disc}% · {x.esc}</span></td>
                <td><StatusBadge status={x.st} /></td>
              </tr>
            ))}
            {loading && <tr><td colSpan={7} className="mu">Loading cases…</td></tr>}
            {loadError && (
              <tr>
                <td colSpan={7} className="mu">
                  {loadError}{" "}
                  <button className="btn sm" type="button" onClick={reloadCases}>Try again</button>
                </td>
              </tr>
            )}
            {!loading && !loadError && !rows.length && <tr><td colSpan={7} className="mu">No legal cases found.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
