import { AlertCircle, LogOut, Mail, ShieldCheck, UserRound } from "lucide-react";
import Button from "../../components/Button";
import { usePlatform } from "../../context/PlatformContext";
import { confirmDiscard, useUnsavedChanges } from "../../hooks/useUnsavedChanges";
import { usePlatformMe } from "../../hooks/usePlatformMe";
import { formatDateTime } from "../../utils/formatDate";
import AvatarImage from "./AvatarImage";
import "./PortalProfile.css";

export default function PortalProfile({ portal, panelLabel }) {
  const { signOutPortal, portalProfile } = usePlatform();
  const sessionProfile = portalProfile(portal);
  const { profile, error, loading } = usePlatformMe(portal);
  const view = profile || sessionProfile;
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

  const logout = () => {
    if (confirmDiscard(false)) signOutPortal(portal);
  };

  return (
    <div className="pp-page">
      <section className="pp-card pp-hero" aria-label="Profile summary">
        <div className="pp-avatar pp-avatar-xl"><AvatarImage photo={view.photoUrl} name={view.name} /></div>
        <div className="pp-hero-text">
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
        <div className="pp-col">
          <section className="pp-card" aria-labelledby="pp-personal">
            <CardHead icon={UserRound} id="pp-personal" title="Personal information">From GET /auth/me</CardHead>
            <dl className="pp-facts">
              <Fact label="Full name" value={view.name} />
              <Fact label="Email address" value={view.email} />
              <Fact label="Profile photo" value={view.photoUrl ? "On file" : ""} />
            </dl>
            <p className="pp-muted">Editing name, phone, job title, department, or photo is unavailable. Those APIs are not provided.</p>
          </section>
          <section className="pp-card">
            <CardHead icon={ShieldCheck} id="pp-password" title="Password">Not connected</CardHead>
            <p className="pp-muted">There is no change-password API for this portal. The current password cannot be changed here.</p>
          </section>
        </div>
        <div className="pp-col">
          <section className="pp-card" aria-labelledby="pp-account">
            <CardHead icon={ShieldCheck} id="pp-account" title="Account information">From the server session</CardHead>
            <dl className="pp-rows">
              <Row label="User ID"><span className="pp-mono">{view.userId}</span></Row>
              <Row label="Email address">{view.email}</Row>
              <Row label="Role">{view.role}</Row>
              <Row label="Panel">{panelLabel}</Row>
            </dl>
          </section>
          <section className="pp-card" aria-labelledby="pp-session">
            <CardHead icon={LogOut} id="pp-session" title="Session">Logging out ends your session in this browser.</CardHead>
            <div className="pp-session">
              <div className="pp-session-info">
                <span className="pp-session-dot" aria-hidden="true" />
                <div>
                  <strong>This browser</strong>
                  <span>{sessionProfile?.signedInAt ? `Signed in ${formatDateTime(sessionProfile.signedInAt)}` : "Current session"}</span>
                </div>
              </div>
              <Button variant="secondary" size="sm" className="pp-danger-btn" onClick={logout}>
                <LogOut size={14} aria-hidden="true" />Log out
              </Button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function CardHead({ icon: Icon, id, title, children }) {
  return (
    <header className="pp-card-head">
      <h3 id={id}><Icon size={16} aria-hidden="true" />{title}</h3>
      {children && <span>{children}</span>}
    </header>
  );
}

function Fact({ label, value }) {
  return (
    <div>
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
