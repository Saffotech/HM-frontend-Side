import { useCallback, useEffect, useId, useRef, useState } from "react";
import { AlertCircle, Camera, CheckCircle2, Loader2, LogOut, Mail, Phone, ShieldCheck, Trash2, UserRound } from "lucide-react";
import { platformAuth } from "../../api/platformSession";
import { platformCallMessage, shouldEndPlatformSession } from "../../api/platformErrors";
import { platformPhotoIssue, profileUpdateBody } from "../../api/platformProfileModel";
import Button from "../../components/Button";
import ConfirmDialog from "../../components/ConfirmDialog";
import { usePlatform } from "../../context/PlatformContext";
import { useUnsavedChanges } from "../../hooks/useUnsavedChanges";
import { usePlatformMe } from "../../hooks/usePlatformMe";
import { useToast } from "../../hooks/useToast";
import useLogoutConfirmation from "@/shared/hooks/useLogoutConfirmation";
import { formatDate, formatDateTime } from "../../utils/formatDate";
import AvatarImage from "./AvatarImage";
import ChangePasswordCard from "./ChangePasswordCard";
import EditProfileDialog from "./EditProfileDialog";
import { parseProfilePhone } from "../../utils/phoneNumbers";
import "./PortalProfile.css";

const PHOTO_ACCEPT = ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp";

function rememberPhoto(photoUrl, portal, patchPortalSession) {
  patchPortalSession(portal, { photoUrl: photoUrl || "" });
  const user = platformAuth.getUser();
  const accessToken = platformAuth.getAccessToken();
  if (!user || !accessToken) return;
  platformAuth.saveSession({
    accessToken,
    refreshToken: platformAuth.getRefreshToken(),
    user: { ...user, photoUrl: photoUrl || "" },
  });
}

function displayPhone(profile) {
  if (!profile?.phone) return "";
  const parsed = parseProfilePhone(profile.phone, profile.phoneCode || profile.phone_code || "");
  return `${parsed.phoneCode} ${parsed.phone}`.trim();
}

function showCreated(value) {
  if (!value) return "";
  const day = String(value).slice(0, 10);
  return formatDate(`${day}T00:00:00`);
}

function statusLabel(isActive) {
  if (isActive === true) return "Active";
  if (isActive === false) return "Inactive";
  return "";
}

export default function PortalProfile({
  portal,
  panelLabel,
  loadProfile,
  updateProfile,
  changePassword,
  uploadPhoto,
  removePhoto,
  mapProfile,
  resolveImageUrl = (url) => url || "",
}) {
  const { signOutPortal, patchPortalSession, portalProfile } = usePlatform();
  const logoutConfirmation = useLogoutConfirmation(() => signOutPortal(portal));
  const sessionProfile = portalProfile(portal);
  const { profile: liveProfile, loading: sessionLoading } = usePlatformMe(portal);
  const { push } = useToast();
  const [account, setAccount] = useState(null);
  const [photoUrl, setPhotoUrl] = useState("");
  const [loadError, setLoadError] = useState("");
  const [photoError, setPhotoError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editDirty, setEditDirty] = useState(false);
  const [passwordDirty, setPasswordDirty] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoActionsOpen, setPhotoActionsOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const fileRef = useRef(null);
  const photoFrameRef = useRef(null);
  const photoLock = useRef(false);
  const loadErrorId = useId();
  useUnsavedChanges(editDirty || passwordDirty);

  const applyBody = useCallback((body) => {
    const mapped = mapProfile(body);
    if (!mapped) return false;
    setAccount(mapped);
    setPhotoUrl(mapped.photoUrl || "");
    setLoadError("");
    rememberPhoto(mapped.photoUrl || "", portal, patchPortalSession);
    return true;
  }, [mapProfile, patchPortalSession, portal]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    loadProfile()
      .then((body) => {
        if (cancelled) return;
        if (!applyBody(body)) setLoadError("Profile response was not recognized.");
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(platformCallMessage(err));
        if (shouldEndPlatformSession(err)) signOutPortal(portal);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [applyBody, loadProfile, portal, reloadKey, signOutPortal]);

  useEffect(() => {
    if (!photoActionsOpen) return undefined;
    const closeMenu = (event) => {
      if (!photoFrameRef.current?.contains(event.target)) setPhotoActionsOpen(false);
    };
    document.addEventListener("mousedown", closeMenu);
    return () => document.removeEventListener("mousedown", closeMenu);
  }, [photoActionsOpen]);

  const identity = {
    name: account?.name || liveProfile?.name || sessionProfile?.name || "",
    email: account?.email || liveProfile?.email || sessionProfile?.email || "",
    role: account?.role || liveProfile?.role || sessionProfile?.role || "",
    userId: account?.userId ?? liveProfile?.userId ?? sessionProfile?.userId,
  };
  const shownPhoto = account ? photoUrl : resolveImageUrl(liveProfile?.photoUrl || sessionProfile?.photoUrl || "");

  const closeEdit = useCallback(() => {
    setEditing(false);
    setEditDirty(false);
  }, []);

  const saveProfile = async (draft) => {
    const body = profileUpdateBody(account, draft);
    if (!Object.keys(body).length) throw new Error("No changes to save.");
    try {
      const updated = await updateProfile(body);
      if (!applyBody(updated)) throw new Error("Profile response was not recognized.");
      setNotice("Profile saved.");
      push("Profile saved.", "success");
    } catch (err) {
      if (shouldEndPlatformSession(err)) signOutPortal(portal);
      throw err;
    }
  };

  const onPhotoFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (photoLock.current) return;
    const issue = platformPhotoIssue(file);
    if (issue) {
      setPhotoError(issue);
      setNotice("");
      return;
    }
    photoLock.current = true;
    setPhotoBusy(true);
    setPhotoError("");
    try {
      const body = await uploadPhoto(file);
      if (!applyBody(body)) {
        setPhotoError("Profile response was not recognized.");
        return;
      }
      setNotice("Photo updated.");
      push("Photo updated.", "success");
    } catch (err) {
      setNotice("");
      setPhotoError(platformCallMessage(err));
      if (shouldEndPlatformSession(err)) signOutPortal(portal);
    } finally {
      photoLock.current = false;
      setPhotoBusy(false);
    }
  };

  const confirmRemove = async () => {
    if (photoLock.current || !shownPhoto) return;
    photoLock.current = true;
    setRemoveOpen(false);
    setPhotoBusy(true);
    setPhotoError("");
    try {
      const body = await removePhoto();
      if (!applyBody(body)) {
        setPhotoError("Profile response was not recognized.");
        return;
      }
      setNotice("Photo removed.");
      push("Photo removed.", "success");
    } catch (err) {
      if (err?.status === 404) {
        setPhotoUrl("");
        setAccount((current) => (current ? { ...current, photoUrl: "" } : current));
        rememberPhoto("", portal, patchPortalSession);
      }
      setNotice("");
      setPhotoError(platformCallMessage(err));
      if (shouldEndPlatformSession(err)) signOutPortal(portal);
    } finally {
      photoLock.current = false;
      setPhotoBusy(false);
    }
  };

  const onPasswordChanged = useCallback((message) => {
    push(message || "Password changed. Sign in again.", "success");
    signOutPortal(portal);
  }, [portal, push, signOutPortal]);

  const endSession = useCallback(() => {
    signOutPortal(portal);
  }, [portal, signOutPortal]);

  if ((loading || sessionLoading) && !account && !loadError) {
    return (
      <div className="pp-page">
        <section className="pp-card pp-state" role="status">
          <Loader2 size={22} className="pp-spin" aria-hidden="true" />
          <strong>Loading your profile</strong>
          <span>Fetching your account from the server.</span>
        </section>
      </div>
    );
  }

  const created = account ? showCreated(account.createdAt) : "";
  const accountStatus = account ? statusLabel(account.isActive) : "";

  return (
    <div className="pp-page">
      <section className="pp-card pp-hero" aria-label="Profile summary" aria-busy={photoBusy}>
        <div className="pp-avatar-frame" ref={photoFrameRef}>
          <button
            type="button"
            className="pp-avatar-trigger"
            aria-label="Profile photo actions"
            aria-haspopup="menu"
            aria-expanded={photoActionsOpen}
            disabled={photoBusy}
            onClick={() => setPhotoActionsOpen((open) => !open)}
          >
            <span className="pp-avatar pp-avatar-xl" aria-hidden="true">
              <AvatarImage photo={shownPhoto} name={identity.name} />
            </span>
            <span className="pp-avatar-btn" aria-hidden="true">
              {photoBusy ? <Loader2 size={14} className="pp-spin" /> : <Camera size={14} />}
            </span>
          </button>
          {photoActionsOpen && (
            <div className="pp-photo-menu" role="menu" aria-label="Profile photo actions">
              <button
                type="button"
                role="menuitem"
                disabled={photoBusy}
                onClick={() => {
                  setPhotoActionsOpen(false);
                  fileRef.current?.click();
                }}
              >
                {shownPhoto ? "Change photo" : "Upload photo"}
              </button>
              {shownPhoto && (
                <button
                  type="button"
                  role="menuitem"
                  className="pp-photo-remove"
                  disabled={photoBusy}
                  onClick={() => {
                    setPhotoActionsOpen(false);
                    setRemoveOpen(true);
                  }}
                >
                  <Trash2 size={14} aria-hidden="true" /> Remove photo
                </button>
              )}
            </div>
          )}
        </div>
        <div className="pp-hero-text">
          <div className="pp-hero-name">
            <h2>{identity.name || "Your profile"}</h2>
            {identity.role ? <span className="pp-role-badge">{identity.role}</span> : null}
          </div>
          <ul className="pp-hero-contact">
            <li><Mail size={14} aria-hidden="true" />{identity.email || "—"}</li>
            {account ? <li><Phone size={14} aria-hidden="true" />{displayPhone(account) || "—"}</li> : null}
          </ul>
          {account?.jobTitle ? <p className="pp-hero-title">{account.jobTitle}</p> : null}
        </div>
        <div className="pp-hero-actions">
          <Button
            size="sm"
            disabled={!account || editing}
            title={account ? undefined : "Profile details have not loaded, so they can't be edited yet."}
            aria-describedby={!account && loadError ? loadErrorId : undefined}
            onClick={() => {
              setNotice("");
              setEditing(true);
            }}
          >
            Edit profile
          </Button>
        </div>
      </section>
      <input
        ref={fileRef}
        type="file"
        accept={PHOTO_ACCEPT}
        className="pp-file"
        tabIndex={-1}
        aria-label="Choose a profile photo"
        onChange={onPhotoFile}
      />

      {notice ? (
        <p className="pp-alert pp-alert-success" role="status">
          <CheckCircle2 size={15} aria-hidden="true" />{notice}
        </p>
      ) : null}
      {loadError ? (
        <div className="pp-alert pp-alert-error" role="alert" id={loadErrorId}>
          <AlertCircle size={15} aria-hidden="true" />
          <span>{loadError}</span>
          <Button variant="secondary" size="sm" disabled={loading} onClick={() => setReloadKey((value) => value + 1)}>
            {loading ? "Loading…" : "Retry"}
          </Button>
        </div>
      ) : null}
      {photoError ? (
        <p className="pp-alert pp-alert-error" role="alert">
          <AlertCircle size={15} aria-hidden="true" />{photoError}
        </p>
      ) : null}

      <div className="pp-grid">
        <div className="pp-col">
          <section className="pp-card" aria-labelledby="pp-personal">
            <CardHead icon={UserRound} id="pp-personal" title="Personal information">Contact details from your profile</CardHead>
            <dl className="pp-facts">
              <Fact label="Full name" value={account?.name || identity.name} />
              <Fact label="Email address" value={account?.email || identity.email} />
              <Fact label="Phone number" value={account ? displayPhone(account) : ""} />
              <Fact label="Job title" value={account?.jobTitle} />
              <Fact label="Address" value={account?.address} />
              <Fact label="City" value={account?.city} />
              <Fact label="State" value={account?.state} />
              <Fact label="Postal code" value={account?.postalCode} />
            </dl>
          </section>
          <ChangePasswordCard
            changePassword={changePassword}
            onDirtyChange={setPasswordDirty}
            onSuccess={onPasswordChanged}
            onSessionEnd={endSession}
          />
        </div>
        <div className="pp-col">
          <section className="pp-card" aria-labelledby="pp-account">
            <CardHead icon={ShieldCheck} id="pp-account" title="Account information">Role and portal</CardHead>
            <dl className="pp-rows">
              <Row label="User ID"><span className="pp-mono">{identity.userId ?? "—"}</span></Row>
              <Row label="Email address">{identity.email}</Row>
              <Row label="Role">{identity.role}</Row>
              <Row label="Panel">{panelLabel}</Row>
              {account ? (
                <Row label="Account status">
                  <span className={`pp-account-status${account.isActive === true ? " is-active" : account.isActive === false ? " is-inactive" : ""}`}>
                    {accountStatus || "—"}
                  </span>
                </Row>
              ) : null}
              {created ? <Row label="Account created">{created}</Row> : null}
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

      {editing && account ? (
        <EditProfileDialog
          profile={account}
          onDirtyChange={setEditDirty}
          onClose={closeEdit}
          onSubmit={saveProfile}
        />
      ) : null}
      <ConfirmDialog
        open={removeOpen}
        title="Remove profile photo"
        message="Remove the current profile photo? You can upload another one later."
        confirmLabel={photoBusy ? "Removing…" : "Remove photo"}
        tone="danger"
        onCancel={() => { if (!photoBusy) setRemoveOpen(false); }}
        onConfirm={confirmRemove}
      />
      {logoutConfirmation.dialog}
    </div>
  );
}

function CardHead({ icon: Icon, id, title, children }) {
  return (
    <header className="pp-card-head">
      <div className="pp-card-heading">
        <h3 id={id}><Icon size={16} aria-hidden="true" />{title}</h3>
        {children ? <span>{children}</span> : null}
      </div>
    </header>
  );
}

function Fact({ label, value }) {
  const text = String(value || "").trim();
  return (
    <div className="pp-fact">
      <dt>{label}</dt>
      <dd className={text ? undefined : "is-empty"}>{text || "—"}</dd>
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
