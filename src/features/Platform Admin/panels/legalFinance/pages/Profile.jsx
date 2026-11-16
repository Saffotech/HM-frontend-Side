import { LogOut } from "lucide-react";
import { usePlatform } from "../../../shared/context/PlatformContext";
import useLogoutConfirmation from "@/shared/hooks/useLogoutConfirmation";
import { useLegalFinance } from "../context/LegalFinanceContext";
import { DISCOUNT_LIMIT } from "../constants";

export default function Profile() {
  const { user } = useLegalFinance();
  const { signOutPortal } = usePlatform();
  const logoutConfirmation = useLogoutConfirmation(() => signOutPortal("legalFinance"));
  const info = [
    ["Employee ID", user.employeeId],
    ["Department", user.department],
    ["Email", user.email],
    ["Discount approval limit", `${DISCOUNT_LIMIT}%`],
  ];
  const permissions = [
    ["can", "Review documents, checklist, price, and the case decision"],
    ["can", `Request Finance Head approval above ${DISCOUNT_LIMIT}%`],
    ["can", "Record that approval or rejection while escalation is Pending"],
    ["cannot", "Record the advance payment or register the hospital"],
  ];
  return (
    <>
      <section className="card lf-profile">
        <div className="lf-profile-head">
          <div className="av" aria-hidden="true">{user.initials}</div>
          <div>
            <h2>{user.name}</h2>
            <p>{user.role}</p>
          </div>
          <button type="button" className="btn" onClick={logoutConfirmation.requestLogout}>
            <LogOut size={14} aria-hidden="true" /> Logout
          </button>
        </div>
        <dl className="lf-profile-facts">
          {info.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <h3>Permissions</h3>
        <ul className="lf-profile-perms">
          {permissions.map(([kind, text]) => (
            <li key={text} className={kind === "cannot" ? "is-no" : "is-yes"}>{text}</li>
          ))}
        </ul>
      </section>
      {logoutConfirmation.dialog}
    </>
  );
}
