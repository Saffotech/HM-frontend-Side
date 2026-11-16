import { Eye } from "lucide-react";
import { formatDate } from "../../../shared/utils/formatDate";
import { useLegalFinance } from "../context/LegalFinanceContext";
import StatusBadge from "./StatusBadge";
import useDocActions from "../hooks/useDocActions";
import { DocPreviewModal, UploadDocModal } from "./DocModals";
import { isLegalDone } from "../utils/caseHelpers";
import { caseIsDecided } from "../../../shared/api/legalCaseModel";

export default function DocsCard({ c }) {
  const { openModal, setDocStatus } = useLegalFinance();
  const { downloadIndex } = useDocActions();
  const locked = !c.id || caseIsDecided(c.st);
  return (
    <div className="card">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <span className="row" style={{ marginBottom: 0 }}>
          <h2 style={{ margin: 0 }}>1. Documents</h2>
          {c.id && <StatusBadge status={isLegalDone(c) ? "Done" : "Pending"} />}
        </span>
        <span>
          <button className="btn" type="button" disabled={!c.docs.length} onClick={() => downloadIndex(c)}>Download all</button>{" "}
          <button className="btn p" type="button" disabled={locked} onClick={() => openModal(<UploadDocModal caseId={c.id} />)}>Upload document</button>
        </span>
      </div>
      <div className="tw">
        <table className="lf-fixed lf-docs">
          <colgroup>
            <col className="c-doc" /><col className="c-cat" /><col className="c-by" />
            <col className="c-date" /><col className="c-st" /><col className="c-act" />
          </colgroup>
          <thead>
            <tr><th>Document</th><th>Category</th><th>Uploaded by</th><th>Date</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {!c.docs.length && (
              <tr><td colSpan={6} className="mu">{c.id ? "No documents uploaded." : "No legal case is open."}</td></tr>
            )}
            {c.docs.map((d, i) => (
              <tr key={d.id ?? i}>
                <td><span className="lf-doc-text" title={d.n}>{d.n}</span></td>
                <td><span className="lf-doc-text" title={d.t}>{d.t}</span></td>
                <td><span className="lf-doc-text" title={d.by}>{d.by}</span></td>
                <td className="lf-date">{formatDate(d.d)}</td>
                <td><StatusBadge status={d.s} /></td>
                <td>
                  <div className="ab">
                    <button className="btn sm" type="button" onClick={() => openModal(<DocPreviewModal caseId={c.id} index={i} />)}><Eye size={14} aria-hidden="true" /> Preview</button>
                    <button className="btn sm p" type="button" disabled={locked} onClick={() => setDocStatus(c.id, i, "Verified")}>Verify</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
