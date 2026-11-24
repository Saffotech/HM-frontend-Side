import StatusBadge from "./StatusBadge";
import Clip from "./Clip";
import { caseFinance, catalogTerm, manualTerm, moneyEachCycle } from "../utils/finance";

export default function FinanceRecords({ c }) {
  const { f, k } = caseFinance(c);
  const rows = c.empty ? [] : [
    ["Catalog Standard Price", c.fr ? "Reviewed by Legal & Finance" : "From CRM catalog", catalogTerm(c, moneyEachCycle(f.std, f.freq)), c.fr ? "Done" : "Pending"],
    ["Price After Discount", c.fr || c.commercialChange ? `Discount offered (${Number(c.disc) || 0}%)` : "Not Set", manualTerm(c, moneyEachCycle(k.pr, f.freq)), c.fr ? c.esc : "Pending"],
  ];
  return (
    <div className="tw">
      <table className="lf-fixed lf-fin">
        <colgroup>
          <col className="c-rec" /><col className="c-ref" /><col className="c-amt" /><col className="c-st" />
        </colgroup>
        <thead><tr><th>Record</th><th>Reference</th><th>Amount</th><th>Status</th></tr></thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row[0]}>
              <td><Clip>{row[0]}</Clip></td>
              <td><Clip>{row[1]}</Clip></td>
              <td><Clip>{row[2]}</Clip></td>
              <td><StatusBadge status={row[3]} /></td>
            </tr>
          ))}
          {!rows.length && (
            <tr><td colSpan={4} className="mu">Not Provided</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
