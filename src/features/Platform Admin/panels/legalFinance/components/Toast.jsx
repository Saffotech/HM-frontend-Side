import { useLegalFinance } from "../context/LegalFinanceContext";

export default function Toast() {
  const { toastMsg } = useLegalFinance();
  if (!toastMsg) return null;
  return (
    <div className="lf-toast" style={toastMsg.err ? { background: "var(--er)" } : undefined}>
      {toastMsg.msg}
    </div>
  );
}
