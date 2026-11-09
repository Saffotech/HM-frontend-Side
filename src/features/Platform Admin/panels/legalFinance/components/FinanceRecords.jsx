import StatusBadge from "./StatusBadge";
import Clip from "./Clip";
import { caseFinance, formatRupees } from "../utils/finance";

export default function FinanceRecords({ c }) {
  const { f, k } = caseFinance(c);
  const rows = c.empty ? [] : [
    ["Standard price", "Saved terms", `${formatRupees(f.std)} / yr`, c.fr ? "Done" : "Pending"],
    ["Proposed price", `${c.disc}% discount`, `${formatRupees(k.pr)} / yr`, c.esc],
    ["Advance", `${f.adv}% of the proposed price`, formatRupees(k.adv), c.pay ? "Received" : "Not received"],
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
        </tbody>
      </table>
    </div>
  );
}
