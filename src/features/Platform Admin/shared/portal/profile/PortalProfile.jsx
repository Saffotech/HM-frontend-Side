import { useState } from "react";
import { AlertCircle, CheckCircle2, LogOut, Mail, Pencil, Phone, ShieldCheck, UserRound } from "lucide-react";
import Button from "../../components/Button";
import { usePlatform } from "../../context/PlatformContext";
import { confirmDiscard, useUnsavedChanges } from "../../hooks/useUnsavedChanges";
import { formatDateTime } from "../../utils/formatDate";
import AvatarImage from "./AvatarImage";
import ChangePasswordCard from "./ChangePasswordCard";
import EditProfileDialog from "./EditProfileDialog";
import "./PortalProfile.css";

/** The signed-in portal user's own profile. `portal` picks the session, so one panel never shows another's user. */
export default function PortalProfile({ portal, panelLabel }) {
  const { portalProfile, signOutPortal } = usePlatform();
  const profile = portalProfile(portal);
  const [editing, setEditing] = useState(false);
  const [editDirty, setEditDirty] = useState(false);
  const [passwordDirty, setPasswordDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const dirty = (editing && editDirty) || passwordDirty;
  useUnsavedChanges(dirty);

  if (!profile) {
    return (
      <div className="pp-page">
        <section className="pp-card pp-state" role="alert">
          <AlertCircle size={26} aria-hidden="true" />
          <strong>Your session has ended</strong>
          <span>Sign in again to see your profile.</span>
        </section>
      </div>
    );
  }

  const openEditor = () => {
    setSaved(false);
    setEditing(true);
  };
  const closeEditor = (didSave) => {
    setEditing(false);
    setEditDirty(false);
    if (didSave) setSaved(true);
  };
  const logout = () => {
    if (confirmDiscard(dirty)) signOutPortal(portal);
  };

  return (
    <div className="pp-page">
      <section className="pp-card pp-hero" aria-label="Profile summary">
        <div className="pp-avatar pp-avatar-xl"><AvatarImage photo={profile.photoUrl} name={profile.name} /></div>
        <div className="pp-hero-text">
          <div className="pp-hero-name">
            <h2>{profile.name}</h2>
            <span className="pp-role-badge">{profile.role}</span>
          </div>
          {profile.jobTitle && <p className="pp-hero-title">{profile.jobTitle}{profile.department ? ` · ${profile.department}` : ""}</p>}
          <ul className="pp-hero-contact">
            <li><Mail size={14} aria-hidden="true" />{profile.email}</li>
            {profile.phone && <li><Phone size={14} aria-hidden="true" />{profile.phone}</li>}
          </ul>
        </div>
        <Button variant="secondary" className="pp-hero-edit" onClick={openEditor}>
          <Pencil size={15} aria-hidden="true" />Edit profile
        </Button>
      </section>

      <div className="pp-grid">
        <div className="pp-col">
          <section className="pp-card" aria-labelledby="pp-personal">
            <CardHead icon={UserRound} id="pp-personal" title="Personal information">
              {profile.updatedAt ? `Updated ${formatDateTime(profile.updatedAt)}` : "Your contact details"}
            </CardHead>
            {saved && (
              <p className="pp-alert pp-alert-success" role="status"><CheckCircle2 size={15} aria-hidden="true" />Profile updated.</p>
            )}
            <dl className="pp-facts">
              <Fact label="Full name" value={profile.name} />
              <Fact label="Email address" value={profile.email} />
              <Fact label="Phone number" value={profile.phone} />
              <Fact label="Job title" value={profile.jobTitle} />
              <Fact label="Department" value={profile.department} />
              <Fact label="Profile photo" value={profile.photoUrl ? "Uploaded" : ""} />
            </dl>
          </section>

          <ChangePasswordCard onDirtyChange={setPasswordDirty} />
        </div>

        <div className="pp-col">
          <section className="pp-card" aria-labelledby="pp-account">
            <CardHead icon={ShieldCheck} id="pp-account" title="Account information">Managed by your administrator</CardHead>
            <dl className="pp-rows">
              <Row label="User ID"><span className="pp-mono">{profile.userId}</span></Row>
              <Row label="Email address">{profile.email}</Row>
              <Row label="Role">{profile.role}</Row>
              <Row label="Panel">{panelLabel}</Row>
              {profile.previousSignInAt && <Row label="Last sign-in">{formatDateTime(profile.previousSignInAt)}</Row>}
            </dl>
          </section>

          <section className="pp-card" aria-labelledby="pp-session">
            <CardHead icon={LogOut} id="pp-session" title="Session">Logging out ends your session in this browser.</CardHead>
            <div className="pp-session">
              <div className="pp-session-info">
                <span className="pp-session-dot" aria-hidden="true" />
                <div>
                  <strong>This browser</strong>
                  <span>{profile.signedInAt ? `Signed in ${formatDateTime(profile.signedInAt)}` : "Current session"}</span>
                </div>
              </div>
              <Button variant="secondary" size="sm" className="pp-danger-btn" onClick={logout}>
                <LogOut size={14} aria-hidden="true" />Log out
              </Button>
            </div>
          </section>
        </div>
      </div>

      {editing && (
        <EditProfileDialog portal={portal} profile={profile} onDirtyChange={setEditDirty} onClose={closeEditor} />
      )}
    </div>
  );
}

function CardHead({ icon: Icon, id, title, children }) {
  return (
    <header className="pp-card-head">
      <span className="pp-card-icon" aria-hidden="true"><Icon size={16} /></span>
      <div>
        <h3 id={id}>{title}</h3>
        {children && <p>{children}</p>}
      </div>
    </header>
  );
}

function Fact({ label, value }) {
  return (
    <div className="pp-fact">
      <dt>{label}</dt>
      <dd className={value ? "" : "is-empty"}>{value || "Not added"}</dd>
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div className="pp-row">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
