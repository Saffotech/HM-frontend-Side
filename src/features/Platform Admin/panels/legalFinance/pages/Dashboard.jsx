import { useState } from "react";
import { useLegalFinance } from "../context/LegalFinanceContext";
import StatusBadge from "../components/StatusBadge";
import useOpenCase from "../hooks/useOpenCase";
import Clip from "../components/Clip";

export default function Dashboard() {
  const { cases, ws, loading, loadError, reloadCases } = useLegalFinance();
  const openCase = useOpenCase();
  const [active, setActive] = useState("all");
  const n = (s) => cases.filter((x) => x.st === s).length;
  const kpis = [
    { id: "all", label: "Leads from CRM", value: cases.length, match: () => true },
    { id: "awaiting", label: "Awaiting review", value: n("New from CRM"), match: (x) => x.st === "New from CRM" },
    { id: "review", label: "In Review", value: n("In Review"), match: (x) => x.st === "In Review" },
    { id: "changes", label: "Changes requested", value: n("Changes Requested"), match: (x) => x.st === "Changes Requested" },
    { id: "approved", label: "Approved", value: n("Approved"), match: (x) => x.st === "Approved" },
    { id: "rejected", label: "Rejected", value: n("Rejected"), match: (x) => x.st === "Rejected" },
  ];
  const selected = kpis.find((k) => k.id === active) || kpis[0];
  const rows = cases.filter(selected.match);
  return (
    <>
      <div className="g g4 lf-kpis" role="group" aria-label="Lead filters">
        {kpis.map((k) => (
          <button
            key={k.id}
            type="button"
            className={"card kpi" + (selected.id === k.id ? " on" : "")}
            aria-pressed={selected.id === k.id}
            onClick={() => setActive(k.id)}
          >
            <b>{k.value}</b><span>{k.label}</span>
          </button>
        ))}
      </div>
      {loading && <p className="mu">Loading cases…</p>}
      {loadError && (
        <div className="err" role="alert">
          {loadError}{" "}
          <button className="btn sm" type="button" onClick={reloadCases}>Try again</button>
        </div>
      )}
      <div className="card">
        <h2>Leads received from CRM</h2>
        <div className="tw">
          <table className="lf-fixed lf-leads">
            <colgroup>
              <col className="c-id" /><col className="c-name" /><col className="c-lead" />
              <col className="c-docs" /><col className="c-st" /><col className="c-act" />
            </colgroup>
            <thead><tr><th>Case</th><th>{ws.nm}</th><th>CRM lead</th><th>Docs</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {rows.map((x) => (
                <tr key={x.id}>
                  <td><Clip>{x.id}</Clip></td>
                  <td><Clip as="a" className="l" onClick={() => openCase("legal", x.id)}>{x.h}</Clip></td>
                  <td><Clip>{x.lead}</Clip></td>
                  <td>{x.docs.length}</td>
                  <td><StatusBadge status={x.st} /></td>
                  <td><button className="btn sm" onClick={() => openCase("legal", x.id)}>Review</button></td>
                </tr>
              ))}
              {!loading && !loadError && !rows.length && <tr><td colSpan={6} className="mu">No legal cases found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
