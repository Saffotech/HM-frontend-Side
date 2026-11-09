import { useState } from "react";
import { CONDITION_OWNERS, caseIsDecided } from "../../../shared/api/legalCaseModel";
import { useLegalFinance } from "../context/LegalFinanceContext";
import { ModalFrame } from "./ModalHost";
import { decisionBlockers } from "../utils/caseHelpers";

function BlockedModal({ kind, blockers }) {
  return (
    <ModalFrame title={`Cannot ${kind === "Approved" ? "approve" : "conditionally approve"} yet`}>
      <div className="err">{blockers.map((b) => <div key={b}>• {b}</div>)}</div>
    </ModalFrame>
  );
}

function DecisionModal({ caseId, kind }) {
  const { recordDecision, closeModal, toast } = useLegalFinance();
  const conditional = kind === "Conditionally Approved";
  const [reason, setReason] = useState("");
  const [condition, setCondition] = useState("");
  const [owner, setOwner] = useState(CONDITION_OWNERS[0]);
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    if (busy) return;
    if (!reason.trim()) return toast("A reason is required", true);
    if (conditional && !condition.trim()) return toast("Enter the condition.", true);
    setBusy(true);
    const saved = await recordDecision(caseId, kind, reason.trim(), conditional ? { c: condition, o: owner } : null);
    setBusy(false);
    if (saved) closeModal();
  };

  return (
    <ModalFrame title={kind} actions={<button className={"btn " + (kind === "Rejected" ? "d" : "p")} type="button" disabled={busy} onClick={confirm}>{busy ? "Saving…" : `Confirm ${kind}`}</button>}>
      {conditional && (
        <>
          <label>Condition</label>
          <input value={condition} onChange={(e) => setCondition(e.target.value)} />
          <label>Condition owner</label>
          <select value={owner} onChange={(e) => setOwner(e.target.value)}>
            {CONDITION_OWNERS.map((item) => <option key={item}>{item}</option>)}
          </select>
          <div className="warn">An approved condition is not a received payment. Accounts records the advance separately.</div>
        </>
      )}
      <label>Reason (required)</label>
      <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
    </ModalFrame>
  );
}

export default function DecisionCard({ c }) {
  const { openModal } = useLegalFinance();
  const blockers = decisionBlockers(c);
  const locked = !c.id || caseIsDecided(c.st);

  const decide = (kind) => {
    if ((kind === "Approved" || kind === "Conditionally Approved") && blockers.length)
      return openModal(<BlockedModal kind={kind} blockers={blockers} />);
    openModal(<DecisionModal caseId={c.id} kind={kind} />);
  };

  return (
    <div className="card">
      <h2>4. Decision</h2>
      {c.id && (blockers.length ? (
        <div className="warn"><b>Before approving:</b><br />{blockers.map((b) => <div key={b}>• {b}</div>)}</div>
      ) : (
        <div className="inf">All requirements met: ready to decide.</div>
      ))}
      <div className="row">
        <button className="btn p" type="button" disabled={locked} onClick={() => decide("Approved")}>Approve</button>
        <button className="btn" type="button" disabled={locked} onClick={() => decide("Conditionally Approved")}>Conditionally Approve</button>
        <button className="btn" type="button" disabled={locked} onClick={() => decide("Changes Requested")}>Request Changes</button>
        <button className="btn d" type="button" disabled={locked} onClick={() => decide("Rejected")}>Reject</button>
      </div>
    </div>
  );
}
