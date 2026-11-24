import { Download, Eye } from "lucide-react";
import { formatDate } from "../../../shared/utils/formatDate";
import { useLegalFinance } from "../context/LegalFinanceContext";
import StatusBadge from "./StatusBadge";
import StageLink from "./StageLink";
import useOpenCase from "../hooks/useOpenCase";
import useDocActions from "../hooks/useDocActions";
import { DocPreviewModal } from "./DocModals";
import HospitalCrmInfo from "./HospitalCrmInfo";
import { caseFinance, catalogTerm, creditLabel, durationLabel, formatRupees, manualTerm, moneyEachCycle } from "../utils/finance";
import { checklistDone, checklistRows, checklistTotal, docsVerified, isLegalDone, isFinanceDone, itemHasVerifiedFile } from "../utils/caseHelpers";
import Clip from "./Clip";

const KV = ({ rows }) => (
  <div className="kv">{rows.map(([l, v]) => <div key={l}><span>{l}</span>{v}</div>)}</div>
);

export default function CaseDetailModal({ caseId }) {
  const { cases, ws, closeModal, openModal } = useLegalFinance();
  const openCase = useOpenCase();
  const { downloadDoc } = useDocActions();
  const x = cases.find((c) => c.id === caseId);
  if (!x) return null;
  const { f, k } = caseFinance(x);
  const nl = checklistDone(x);
  const nt = checklistTotal(x);
  const nv = docsVerified(x);

  return (
    <>
      <div className="hh">
        <div className="hi">{ws.ic}</div>
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0, fontSize: 19 }}><Clip>{x.h}</Clip></h2>
          <span className="mu">Lead {x.lead}</span>
        </div>
        <StatusBadge status={x.st} />
        <button className="btn sm" onClick={closeModal} title="Close">✕</button>
      </div>

      <div className="tiles">
        <div className="tile"><small>Legal docs</small><b>{nv}/{x.docs.length} verified</b><StageLink done={isLegalDone(x)} section="legal" caseId={x.id} /></div>
        <div className="tile"><small>Legal checklist</small><b>{nl}/{nt} done</b><div className="bar"><i style={{ width: nt ? (nl / nt) * 100 + "%" : "0%" }} /></div></div>
        <div className="tile"><small>Finance</small><b>{x.disc}% discount</b><StageLink done={isFinanceDone(x)} section="finance" caseId={x.id} /></div>
        <div className="tile"><small>Contract value</small><b>{manualTerm(x, formatRupees(k.tot))}</b><span className="mu">{x.fr || x.commercialChange ? `+ tax ${formatRupees(k.gst)}` : "Not Set until finance review"}</span></div>
      </div>

      <HospitalCrmInfo c={x} />

      <div className="sec" style={{ marginBottom: 12 }}>
        <h3>Pricing &amp; payment <em className="lf-source">{x.fr ? "Reviewed by Legal & Finance" : "Finance review"}</em></h3>
        <KV rows={[
          ["Catalog Standard Price", catalogTerm(x, moneyEachCycle(f.std, f.freq))],
          ["Price After Discount", manualTerm(x, moneyEachCycle(k.pr, f.freq))],
          ["Subscription Period", manualTerm(x, durationLabel(f.yrs))],
          ["One-Time Setup Fee", manualTerm(x, formatRupees(f.impl))],
          ["Staff Training Fee", manualTerm(x, formatRupees(f.trn))],
          ["Payment Terms", f.freq || "Not Set"],
          ["Payment Due", manualTerm(x, creditLabel(f.cr))],
          ["Discount escalation", <StatusBadge key="esc" status={x.esc} />],
        ]} />
      </div>

      <div className="sec">
        <h3>Uploaded documents ({x.docs.length})</h3>
        <div className="tw">
          <table className="lf-fixed lf-docs">
            <colgroup>
              <col className="c-doc" /><col className="c-cat" /><col className="c-by" />
              <col className="c-date" /><col className="c-st" /><col className="c-act" />
            </colgroup>
            <thead><tr><th>Document</th><th>Category</th><th>Uploaded by</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {x.docs.map((d, j) => (
                <tr key={d.id ?? j}>
                  <td><span className="lf-doc-text" title={d.n}>{d.n}</span></td>
                  <td><span className="lf-doc-text" title={d.t}>{d.t}</span></td>
                  <td><span className="lf-doc-text" title={d.by}>{d.by}</span></td>
                  <td className="lf-date">{formatDate(d.d)}</td>
                  <td><StatusBadge status={d.s} /></td>
                  <td>
                    <div className="ab">
                      <button className="btn sm" onClick={() => openModal(<DocPreviewModal caseId={x.id} index={j} />)}><Eye size={14} aria-hidden="true" /> Preview</button>
                      <button className="btn sm" onClick={() => downloadDoc(d, x)}><Download size={14} aria-hidden="true" /> Download</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!x.docs.length && <tr><td colSpan={6} className="mu">No documents uploaded yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="sec">
        <h3>Legal checklist</h3>
        <div className="cg">
          {checklistRows(x).map((c) => (
            <div key={c.key}>
              {itemHasVerifiedFile(c) ? <b style={{ color: "var(--ok)" }}>✓</b> : <b className="mu">○</b>}
              <span>
                {c.t}
                {c.docs?.length ? <><br /><span className="mu">{c.docs.map((d) => d.n).join(", ")}</span></> : null}
                {c.n && <><br /><span className="mu">{c.n}</span></>}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="sec">
        <h3>Decision</h3>
        {x.dec ? (
          <p style={{ margin: 0 }}><StatusBadge status={x.dec.k} /> {x.dec.r || "(no comment)"}</p>
        ) : (
          <p className="mu" style={{ margin: 0 }}>No decision recorded yet.</p>
        )}
        {x.cond && (
          <p style={{ margin: "8px 0 0" }}>
            Condition: {x.cond.c} (owner {x.cond.o || "—"})
          </p>
        )}
      </div>

      <div className="row" style={{ justifyContent: "flex-end", margin: 0 }}>
        <button className="btn" onClick={closeModal}>Close</button>
        <button className="btn" onClick={() => openCase("finance", x.id)}>Open Finance</button>
        <button className="btn p" onClick={() => openCase("legal", x.id)}>Open Legal Docs</button>
      </div>
    </>
  );
}
