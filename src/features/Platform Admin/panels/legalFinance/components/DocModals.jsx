import { useEffect, useState } from "react";
import { documentFileError } from "../../../shared/api/legalCaseModel";
import { useLegalFinance } from "../context/LegalFinanceContext";
import { ModalFrame } from "./ModalHost";
import StatusBadge from "./StatusBadge";
import useDocActions from "../hooks/useDocActions";

function useDocumentUrl(caseId, doc) {
  const { loadDocumentFile } = useLegalFinance();
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!doc?.id) return undefined;
    let active = true;
    let objectUrl = "";
    setUrl("");
    setError("");
    loadDocumentFile(caseId, doc.id).then((file) => {
      if (!active) return;
      if (!file?.blob) {
        setError("The document could not be opened.");
        return;
      }
      objectUrl = URL.createObjectURL(file.blob);
      setUrl(objectUrl);
    });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [caseId, doc?.id, loadDocumentFile]);

  return { url, error };
}

function DocumentFrame({ caseId, doc }) {
  const { url, error } = useDocumentUrl(caseId, doc);
  if (error) return <p className="err">{error}</p>;
  if (!url) return <p className="mu">Loading document…</p>;
  return (
    <iframe
      title={doc.n}
      src={url}
      style={{ width: "100%", height: "100%", minHeight: 250, border: "1px solid var(--bd)", background: "#fff" }}
    />
  );
}

export function DocPreviewModal({ caseId, index }) {
  const { cases, closeModal, openModal, setDocStatus } = useLegalFinance();
  const { downloadDoc } = useDocActions();
  const c = cases.find((item) => item.id === caseId);
  const d = c && c.docs[index];
  if (!d) return null;
  return (
    <>
      <h2>{d.n}</h2>
      <div className="g h2c">
        <DocumentFrame caseId={caseId} doc={d} />
        <div>
          <p>{d.t}<br />Uploaded by {d.by}<br /><StatusBadge status={d.s} /></p>
        </div>
      </div>
      <div className="row" style={{ justifyContent: "flex-end", marginTop: 12 }}>
        <button className="btn" type="button" onClick={() => openModal(<DocFullModal caseId={caseId} index={index} />, { wide: true })}>View full document</button>
        <button className="btn" type="button" onClick={() => downloadDoc(d, c)}>Download</button>
        <button className="btn" type="button" onClick={() => { closeModal(); setDocStatus(caseId, index, "Changes Requested"); }}>Request changes</button>
        <button className="btn p" type="button" onClick={() => { closeModal(); setDocStatus(caseId, index, "Verified"); }}>Verify</button>
      </div>
    </>
  );
}

export function DocFullModal({ caseId, index }) {
  const { cases, closeModal, openModal } = useLegalFinance();
  const { downloadDoc } = useDocActions();
  const c = cases.find((item) => item.id === caseId);
  const d = c && c.docs[index];
  if (!d) return null;
  return (
    <>
      <div className="hh" style={{ marginBottom: 10, paddingBottom: 10 }}>
        <div className="hi" style={{ width: 40, height: 40, fontSize: 20 }}>📄</div>
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0 }}>{d.n}</h2>
          <span className="mu">{d.t} · {d.by}</span>
        </div>
        <StatusBadge status={d.s} />
      </div>
      <div style={{ height: "68vh" }}>
        <DocumentFrame caseId={caseId} doc={d} />
      </div>
      <div className="row" style={{ justifyContent: "flex-end", margin: "12px 0 0" }}>
        <button className="btn" type="button" onClick={() => openModal(<DocPreviewModal caseId={caseId} index={index} />)}>← Back to preview</button>
        <button className="btn" type="button" onClick={() => downloadDoc(d, c)}>Download</button>
        <button className="btn p" type="button" onClick={closeModal}>Close</button>
      </div>
    </>
  );
}

export function UploadDocModal({ caseId }) {
  const { ws, addDocument, closeModal, toast } = useLegalFinance();
  const [category, setCategory] = useState(ws.DT[0]);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);

  const upload = async () => {
    const problem = documentFileError(file);
    if (problem) {
      toast(problem, true);
      return;
    }
    if (!ws.DT.includes(category)) {
      toast("Choose a hospital document category.", true);
      return;
    }
    setBusy(true);
    const saved = await addDocument(caseId, { category, file });
    setBusy(false);
    if (saved) closeModal();
  };

  return (
    <ModalFrame
      title="Upload document"
      actions={<button className="btn p" type="button" disabled={busy} onClick={upload}>{busy ? "Uploading…" : "Upload"}</button>}
    >
      <label>Category</label>
      <select value={category} onChange={(event) => setCategory(event.target.value)}>
        {ws.DT.map((item) => <option key={item}>{item}</option>)}
      </select>
      <label>File</label>
      <input
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
        onChange={(event) => setFile(event.target.files?.[0] || null)}
      />
      <p className="mu">PDF, JPG, PNG, or WEBP. Maximum 5 MB.</p>
    </ModalFrame>
  );
}
