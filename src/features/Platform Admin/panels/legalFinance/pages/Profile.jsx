import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { usePlatform } from "../../../shared/context/PlatformContext";
import useLogoutConfirmation from "@/shared/hooks/useLogoutConfirmation";
import { useLegalFinance } from "../context/LegalFinanceContext";
import { STATUS_GROUPS } from "../utils/status";
import { LF_BASE_PATH, DISCOUNT_LIMIT } from "../constants";

export default function Profile() {
  const { user, cases, ws } = useLegalFinance();
  const { signOutPortal } = usePlatform();
  const logoutConfirmation = useLogoutConfirmation(() => signOutPortal("legalFinance"));
  const navigate = useNavigate();
  const n = (g) => cases.filter((x) => STATUS_GROUPS[g].includes(x.st)).length;
  const info = [
    ["Employee ID", user.employeeId],
    ["Department", user.department],
    ["Email", user.email],
    ["Discount approval limit", DISCOUNT_LIMIT + "%"],
  ];
  return (
    <>
      <div className="g g2">
        <div className="card">
          <div className="row">
            <div className="av" style={{ width: 56, height: 56, fontSize: 18 }}>{user.initials}</div>
            <div><b style={{ fontSize: 16 }}>{user.name}</b><br /><span className="mu">{user.role}</span></div>
            <button type="button" className="btn" style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6 }} onClick={logoutConfirmation.requestLogout}>
              <LogOut size={14} aria-hidden="true" /> Logout
            </button>
          </div>
          <div className="kv">{info.map(([l, v]) => <div key={l}><span>{l}</span>{v}</div>)}</div>
          <h2 style={{ marginTop: 14 }}>Permissions</h2>
          <p>✓ Review documents, checklist, price, and the case decision<br />✓ Request Finance Head approval above {DISCOUNT_LIMIT}%<br />✓ Record that approval or rejection while escalation is Pending<br />✗ Record the advance payment or register the hospital</p>
        </div>
        <div className="card">
          <h2>My caseload</h2>
          {Object.keys(STATUS_GROUPS).map((g) => <p key={g}>{g}: <b>{n(g)}</b></p>)}
          <button className="btn p" onClick={() => navigate(`${LF_BASE_PATH}/cases`)}>View My {ws.pl}</button>
        </div>
      </div>
      {logoutConfirmation.dialog}
    </>
  );
}
