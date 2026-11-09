import { useLegalFinance } from "../context/LegalFinanceContext";

export default function CaseBanner({ c }) {
  const { resubmit } = useLegalFinance();
  const decided = ["Approved", "Conditionally Approved", "Rejected"].includes(c.st);
  return (
    <>
      {c.st === "Changes Requested" && (
        <div className="err">
          <b>Returned for corrections:</b> {c.dec?.r || ""}<br />
          <button className="btn sm" type="button" onClick={() => resubmit(c.id)}>Resubmit</button>
        </div>
      )}
      {decided && (
        <div className={c.st === "Rejected" ? "err" : "inf"}>
          <b>Decision: {c.st}.</b> {c.dec ? c.dec.r : ""}
          {c.cond && (
            <>
              <br />Condition: {c.cond.c} (owner {c.cond.o || "—"})
            </>
          )}
          <br />
          <b>{c.pay ? "Advance recorded by Accounts." : "Advance not recorded. Approval does not record the payment."}</b>
        </div>
      )}
    </>
  );
}
