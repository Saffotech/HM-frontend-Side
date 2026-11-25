import { useLegalFinance } from "../context/LegalFinanceContext";

export default function CaseBanner({ c }) {
  const { resubmit } = useLegalFinance();
  if (c.st !== "Changes Requested") return null;
  return (
    <div className="err">
      <b>Returned for corrections:</b> {c.dec?.r || ""}<br />
      <button className="btn sm" type="button" onClick={() => resubmit(c.id)}>Resubmit</button>
    </div>
  );
}
