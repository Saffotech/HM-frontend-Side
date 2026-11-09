import { Download, Eye } from "lucide-react";
import { useLegalFinance } from "../context/LegalFinanceContext";
import StatusBadge from "./StatusBadge";
import StageLink from "./StageLink";
import useOpenCase from "../hooks/useOpenCase";
import useDocActions from "../hooks/useDocActions";
import { DocPreviewModal } from "./DocModals";
import { caseFinance, formatRupees } from "../utils/finance";
import { checklistDone, docsVerified, isLegalDone, isFinanceDone } from "../utils/caseHelpers";
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
        <div className="tile"><small>Legal checklist</small><b>{nl}/{x.cl.length} done</b><div className="bar"><i style={{ width: x.cl.length ? (nl / x.cl.length) * 100 + "%" : "0%" }} /></div></div>
        <div className="tile"><small>Finance</small><b>{x.disc}% discount</b><StageLink done={isFinanceDone(x)} section="finance" caseId={x.id} /></div>
        <div className="tile"><small>Contract value</small><b>{formatRupees(k.tot)}</b><span className="mu">+ tax {formatRupees(k.gst)}</span></div>
      </div>

      <div className="g h2c" style={{ marginBottom: 12 }}>
        <div className="sec" style={{ margin: 0 }}>
          <h3>{ws.nm} details</h3>
          <KV rows={[
            ["Lead", x.lead],
            ["City", x.city || "—"],
            ["Plan", x.plan || "—"],
            ["GSTIN", f.gst || "—"],
            ["Invoice email", f.mail || "—"],
            ["Escalation", x.esc],
            ["Decision", x.dec?.k || "—"],
            ["Advance", x.pay ? "Received" : "Not received"],
          ]} />
        </div>
        <div className="sec" style={{ margin: 0 }}>
          <h3>Finance summary</h3>
          <KV rows={[
            ["Proposed price", formatRupees(k.pr) + " / yr"],
            ["Duration", f.yrs + " years"],
            ["Payment", `${f.freq} · ${f.adv}% advance`],
            ["Credit period", f.cr + " days"],
            ["Discount escalation", <StatusBadge key="esc" status={x.esc} />],
            ["Advance payment", <StatusBadge key="pay" status={x.pay ? "Received" : "Not received"} />],
          ]} />
        </div>
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
                  <td><Clip>{"📄 " + d.n}</Clip></td>
                  <td><Clip>{d.t}</Clip></td>
                  <td><Clip>{d.by}</Clip></td>
                  <td><Clip>{d.d}</Clip></td>
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
          {x.cl.map((c) => (
            <div key={c.t}>
              {c.s === "Verified" || c.s === "Not applicable" ? <b style={{ color: "var(--ok)" }}>✓</b> : <b className="mu">○</b>}
              <span>{c.t}{c.n && <><br /><span className="mu">{c.n}</span></>}</span>
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
            Condition: {x.cond.c} (owner {x.cond.o || "—"}) · <b>{x.pay ? "Advance recorded by Accounts" : "Advance not recorded"}</b>
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
