import { useEffect, useState } from "react";
import { ClipboardList } from "lucide-react";
import { caseIsDecided } from "../../../shared/api/legalCaseModel";
import { useLegalFinance } from "../context/LegalFinanceContext";
import StatusBadge from "./StatusBadge";
import { checklistDone, checklistRows, checklistTotal } from "../utils/caseHelpers";
import { CHECKLIST_OPTIONS } from "../utils/status";

function fileLine(item) {
  if (!item.category) return "";
  if (!item.docs?.length) return "No file uploaded";
  return item.docs.map((doc) => doc.n).join(", ");
}

function ChecklistRow({ item, index, onChange, locked }) {
  const [note, setNote] = useState(item.n || "");
  useEffect(() => {
    setNote(item.n || "");
  }, [item.id, item.n]);

  const hasFile = Boolean(item.docs?.length);
  const shownStatus = hasFile ? item.s : "Pending";
  const options = hasFile ? CHECKLIST_OPTIONS : ["Pending", "Not applicable"];

  const saveNote = () => {
    if (locked || item.source !== "checklist" || note === (item.n || "")) return;
    onChange(item, { n: note, s: item.s });
  };

  const files = fileLine(item);

  return (
    <div className="lf-check-item">
      <span className="lf-check-num">{String(index + 1).padStart(2, "0")}</span>
      <div className="lf-check-copy">
        <b className="lf-check-title">{item.t}</b>
        {files ? <span className="lf-check-files" title={files}>{files}</span> : null}
      </div>
      <StatusBadge status={shownStatus} />
      <div className="lf-check-tools">
        <select
          value={shownStatus}
          disabled={locked}
          title={!hasFile ? "Upload a file to verify, or mark Not applicable" : undefined}
          onChange={(event) => onChange(item, { s: event.target.value, n: note })}
        >
          {options.map((option) => <option key={option}>{option}</option>)}
        </select>
        <input
          placeholder={!hasFile ? "Upload a file, or mark Not applicable" : "Reviewer notes"}
          value={note}
          disabled={locked || item.source === "document"}
          onChange={(event) => setNote(event.target.value)}
          onBlur={saveNote}
        />
      </div>
    </div>
  );
}

export default function ChecklistCard({ c }) {
  const { setChecklistItem, setDocsStatusForCategory } = useLegalFinance();
  const rows = checklistRows(c);
  const done = checklistDone(c);
  const total = checklistTotal(c);
  const locked = !c.id || caseIsDecided(c.st);

  const onChange = (item, patch) => {
    const hasFile = Boolean(item.docs?.length);
    if (!hasFile && patch.s !== "Pending" && patch.s !== "Not applicable") return;
    if (hasFile && item.source === "document") {
      return setDocsStatusForCategory(c.id, item.category, patch.s);
    }
    return setChecklistItem(c.id, item.clIndex, patch);
  };

  return (
    <div className="card lf-check">
      <div className="lf-check-head">
        <span className="lf-check-ico" aria-hidden="true"><ClipboardList size={20} /></span>
        <div>
          <h2>Legal Checklist{total ? ` (${done}/${total})` : ""}</h2>
          <p>Internal checklist. Uploaded files alone do not establish legal compliance.</p>
        </div>
        {total > 0 && (
          <div className="lf-check-prog">
            <span>{done} of {total} completed</span>
            <div className="bar"><i style={{ width: (done / total) * 100 + "%" }} /></div>
          </div>
        )}
      </div>
      {!rows.length && <p className="mu">{c.id ? "No checklist items were returned." : "No legal case is open."}</p>}
      {rows.map((item, index) => (
        <ChecklistRow key={item.key} item={item} index={index} onChange={onChange} locked={locked} />
      ))}
    </div>
  );
}
