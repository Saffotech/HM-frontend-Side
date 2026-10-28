import { AlertCircle, LogOut, Mail, ShieldCheck, UserRound } from "lucide-react";
import Button from "../../components/Button";
import { usePlatform } from "../../context/PlatformContext";
import { useUnsavedChanges } from "../../hooks/useUnsavedChanges";
import { usePlatformMe } from "../../hooks/usePlatformMe";
import useLogoutConfirmation from "@/shared/hooks/useLogoutConfirmation";
import { formatDateTime } from "../../utils/formatDate";
import AvatarImage from "./AvatarImage";
import "./PortalProfile.css";

export default function PortalProfile({ portal, panelLabel }) {
  const { signOutPortal, portalProfile } = usePlatform();
  const sessionProfile = portalProfile(portal);
  const { profile, error, loading } = usePlatformMe(portal);
  const view = profile || sessionProfile;
  const isCrm = portal === "crm";
  const logoutConfirmation = useLogoutConfirmation(() => signOutPortal(portal));
  useUnsavedChanges(false);

  if (loading && !view) {
    return (
      <div className="pp-page">
        <section className="pp-card pp-state">
          <strong>Loading your profile</strong>
          <span>Fetching GET /auth/me.</span>
        </section>
      </div>
    );
  }

  if (!view) {
    return (
      <div className="pp-page">
        <section className="pp-card pp-state" role="alert">
          <AlertCircle size={26} aria-hidden="true" />
          <strong>Your session has ended</strong>
          <span>{error || "Sign in again to see your profile."}</span>
        </section>
      </div>
    );
  }

  return (
    <div className={`pp-page${isCrm ? " pp-page-crm" : ""}`}>
      <section className="pp-card pp-hero" aria-label={isCrm ? "Personal information" : "Profile summary"}>
        <div className="pp-avatar pp-avatar-xl"><AvatarImage photo={view.photoUrl} name={view.name} /></div>
        <div className="pp-hero-text">
          {isCrm && <span className="pp-hero-eyebrow">Personal information</span>}
          <div className="pp-hero-name">
            <h2>{view.name}</h2>
            <span className="pp-role-badge">{view.role}</span>
          </div>
          <ul className="pp-hero-contact">
            <li><Mail size={14} aria-hidden="true" />{view.email}</li>
          </ul>
        </div>
      </section>
      {error && (
        <p className="pp-alert" role="alert">
          <AlertCircle size={15} aria-hidden="true" /> {error}
        </p>
      )}
      <div className="pp-grid">
        {!isCrm && (
          <div className="pp-col">
            <section className="pp-card" aria-labelledby="pp-personal">
              <CardHead icon={UserRound} id="pp-personal" title="Personal information">Profile details</CardHead>
              <dl className="pp-facts">
                <Fact label="Full name" value={view.name} />
                <Fact label="Email address" value={view.email} />
                <Fact label="Profile photo" value={view.photoUrl ? "On file" : ""} />
              </dl>
              <p className="pp-muted">Profile editing is not available for this account.</p>
            </section>
            <section className="pp-card">
              <CardHead icon={ShieldCheck} id="pp-password" title="Password">Not connected</CardHead>
              <p className="pp-muted">Password changes are not available for this account.</p>
            </section>
          </div>
        )}
        <div className={`pp-col${isCrm ? " pp-col-crm-account" : ""}`}>
          <section className="pp-card" aria-labelledby="pp-account">
            <CardHead icon={ShieldCheck} id="pp-account" title="Account information">
              {isCrm ? "Identity, access and organization" : "Role and portal"}
            </CardHead>
            <dl className="pp-rows">
              <Row label="User ID"><span className="pp-mono">{view.userId}</span></Row>
              {isCrm ? (
                <>
                  <Row label="Role">{view.role}</Row>
                  <Row label="Role ID"><span className="pp-mono">{view.roleId ?? "—"}</span></Row>
                  <Row label="Account status">
                    <span className={`pp-account-status${view.isActive === true ? " is-active" : view.isActive === false ? " is-inactive" : ""}`}>
                      {view.isActive == null ? "Unknown" : view.isActive ? "Active" : "Inactive"}
                    </span>
                  </Row>
                  <Row label="Account created">{view.createdAt ? formatDateTime(view.createdAt) : "—"}</Row>
                  <Row label="Hospital">
                    {view.hospital
                      ? [view.hospital.name, view.hospital.code, view.hospital.id != null ? `ID ${view.hospital.id}` : ""].filter(Boolean).join(" · ") || "Assigned hospital"
                      : "Platform account"}
                  </Row>
                  <Row label="Panel">{panelLabel}</Row>
                </>
              ) : (
                <>
                  <Row label="Email address">{view.email}</Row>
                  <Row label="Role">{view.role}</Row>
                  <Row label="Panel">{panelLabel}</Row>
                </>
              )}
            </dl>
          </section>
          <section className="pp-card" aria-labelledby="pp-session">
            <CardHead icon={LogOut} id="pp-session" title="Session">Current browser session</CardHead>
            <div className="pp-session">
              <div className="pp-session-info">
                <span className="pp-session-dot" aria-hidden="true" />
                <div>
                  <strong>This browser</strong>
                  <span>{sessionProfile?.signedInAt ? `Signed in ${formatDateTime(sessionProfile.signedInAt)}` : "Current session"}</span>
                </div>
              </div>
              <Button variant="secondary" size="sm" className="pp-danger-btn" onClick={logoutConfirmation.requestLogout}>
                <LogOut size={14} aria-hidden="true" />Log out
              </Button>
            </div>
          </section>
        </div>
      </div>
      {logoutConfirmation.dialog}
    </div>
  );
}

function CardHead({ icon: Icon, id, title, children }) {
  return (
    <header className="pp-card-head">
      <div className="pp-card-heading">
        <h3 id={id}><Icon size={16} aria-hidden="true" />{title}</h3>
        {children && <span>{children}</span>}
      </div>
    </header>
  );
}

function Fact({ label, value }) {
  return (
    <div className="pp-fact">
      <dt>{label}</dt>
      <dd>{value || "—"}</dd>
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div className="pp-row">
      <dt>{label}</dt>
      <dd>{children || "—"}</dd>
    </div>
  );
}
