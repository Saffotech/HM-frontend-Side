import { useEffect, useState } from "react";
import { ClipboardList } from "lucide-react";
import { caseIsDecided } from "../../../shared/api/legalCaseModel";
import { useLegalFinance } from "../context/LegalFinanceContext";
import StatusBadge from "./StatusBadge";
import { checklistDone } from "../utils/caseHelpers";
import { CHECKLIST_OPTIONS } from "../utils/status";

function ChecklistRow({ item, index, caseId, onChange, locked }) {
  const [note, setNote] = useState(item.n || "");
  useEffect(() => {
    setNote(item.n || "");
  }, [item.id, item.n]);

  const saveNote = () => {
    if (locked || note === (item.n || "")) return;
    onChange(caseId, index, { n: note, s: item.s });
  };

  return (
    <div className="lf-check-item">
      <span className="lf-check-num">{String(index + 1).padStart(2, "0")}</span>
      <b className="lf-check-title">{item.t}</b>
      <StatusBadge status={item.s} />
      <div className="lf-check-tools">
        <select
          value={item.s}
          disabled={locked}
          onChange={(event) => onChange(caseId, index, { s: event.target.value, n: note })}
        >
          {CHECKLIST_OPTIONS.map((option) => <option key={option}>{option}</option>)}
        </select>
        <input
          placeholder="Reviewer notes"
          value={note}
          disabled={locked}
          onChange={(event) => setNote(event.target.value)}
          onBlur={saveNote}
        />
      </div>
    </div>
  );
}

export default function ChecklistCard({ c }) {
  const { setChecklistItem } = useLegalFinance();
  const done = checklistDone(c);
  const total = c.cl.length;
  const locked = !c.id || caseIsDecided(c.st);
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
      {!c.cl.length && <p className="mu">{c.id ? "No checklist items were returned." : "No legal case is open."}</p>}
      {c.cl.map((item, index) => (
        <ChecklistRow key={item.id ?? item.t} item={item} index={index} caseId={c.id} onChange={setChecklistItem} locked={locked} />
      ))}
    </div>
  );
}
