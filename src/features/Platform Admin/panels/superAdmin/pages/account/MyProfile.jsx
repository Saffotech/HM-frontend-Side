import { useEffect, useRef, useState } from "react";
import { Camera, Trash2 } from "lucide-react";
import { platformAuth } from "../../../../shared/api/platformSession";
import {
  changePlatformAdminPassword,
  getPlatformAdminProfile,
  mapPlatformAdminProfile,
  platformPasswordIssue,
  platformPhotoIssue,
  profileDraft,
  profileUpdateBody,
  removePlatformAdminPhoto,
  updatePlatformAdminProfile,
  uploadPlatformAdminPhoto,
} from "../../../../shared/api/platformAdminProfile";
import { interpretPlatformError, platformCallMessage, shouldEndPlatformSession } from "../../../../shared/api/platformErrors";
import Button from "../../../../shared/components/Button";
import Input from "../../../../shared/components/Input";
import PasswordField from "../../../../shared/components/PasswordField";
import { usePlatform } from "../../../../shared/context/PlatformContext";
import { usePlatformMe } from "../../../../shared/hooks/usePlatformMe";
import { useToast } from "../../../../shared/hooks/useToast";
import { initials } from "../../../../shared/utils/validation";
import "./MyProfile.css";

const PROFILE_ERROR_FIELDS = {
  phone: "phone",
  phone_code: "phoneCode",
  address: "address",
  city: "city",
  state: "state",
  postal_code: "postalCode",
  job_title: "jobTitle",
};

function rememberPhoto(photoUrl, patchPortalSession) {
  patchPortalSession("platform", { photoUrl: photoUrl || "" });
  const user = platformAuth.getUser();
  const accessToken = platformAuth.getAccessToken();
  if (!user || !accessToken) return;
  platformAuth.saveSession({
    accessToken,
    refreshToken: platformAuth.getRefreshToken(),
    user: { ...user, photoUrl: photoUrl || "" },
  });
}

export default function MyProfile() {
  const { signOutPortal, patchPortalSession } = usePlatform();
  const { push } = useToast();
  const { profile: sessionProfile, loading: sessionLoading } = usePlatformMe("platform");
  const [account, setAccount] = useState(null);
  const [draft, setDraft] = useState(null);
  const [photoUrl, setPhotoUrl] = useState("");
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [password, setPassword] = useState({ current: "", next: "" });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [passwordError, setPasswordError] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    getPlatformAdminProfile()
      .then((body) => {
        if (cancelled) return;
        const mapped = mapPlatformAdminProfile(body);
        if (!mapped) {
          setLoadError("Profile response was not recognized.");
          return;
        }
        setAccount(mapped);
        setDraft(profileDraft(mapped));
        setPhotoUrl(mapped.photoUrl || "");
        rememberPhoto(mapped.photoUrl, patchPortalSession);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(platformCallMessage(err));
        if (shouldEndPlatformSession(err)) signOutPortal("platform");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [patchPortalSession, signOutPortal]);

  const identity = {
    name: account?.name || sessionProfile?.name || "",
    email: account?.email || sessionProfile?.email || "",
    role: account?.role || sessionProfile?.role || "",
    userId: account?.userId ?? sessionProfile?.userId,
  };

  const setField = (key, value) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
    setFormError("");
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    if (!draft || saving) return;
    const body = profileUpdateBody(account, draft);
    if (!Object.keys(body).length) {
      setFormError("No changes to save.");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      const updated = await updatePlatformAdminProfile(body);
      const mapped = mapPlatformAdminProfile(updated);
      const next = mapped ? { ...account, ...mapped, ...profileDraft(mapped) } : { ...account, ...draft };
      setAccount(next);
      setDraft(profileDraft(next));
      if (mapped?.photoUrl) setPhotoUrl(mapped.photoUrl);
      push("Profile saved.", "success");
    } catch (err) {
      const result = interpretPlatformError(err, PROFILE_ERROR_FIELDS);
      if (Object.keys(result.fieldErrors).length) setErrors(result.fieldErrors);
      setFormError(err?.status === 422 ? "Check the highlighted fields." : platformCallMessage(err));
      if (shouldEndPlatformSession(err)) signOutPortal("platform");
    } finally {
      setSaving(false);
    }
  };

  const applyPhoto = (url) => {
    setPhotoUrl(url || "");
    setAccount((current) => (current ? { ...current, photoUrl: url || "" } : current));
    rememberPhoto(url, patchPortalSession);
  };

  const uploadPhoto = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    const issue = platformPhotoIssue(file);
    if (issue) {
      setFormError(issue);
      return;
    }
    setPhotoBusy(true);
    setFormError("");
    try {
      const body = await uploadPlatformAdminPhoto(file);
      const mapped = mapPlatformAdminProfile(body);
      applyPhoto(mapped?.photoUrl || body?.profile_image_url || "");
      push("Photo updated.", "success");
    } catch (err) {
      setFormError(platformCallMessage(err));
      if (shouldEndPlatformSession(err)) signOutPortal("platform");
    } finally {
      setPhotoBusy(false);
    }
  };

  const removePhoto = async () => {
    if (photoBusy || !photoUrl) return;
    setPhotoBusy(true);
    setFormError("");
    try {
      const body = await removePlatformAdminPhoto();
      const mapped = mapPlatformAdminProfile(body);
      applyPhoto(mapped?.photoUrl || "");
      push("Photo removed.", "success");
    } catch (err) {
      setFormError(platformCallMessage(err));
      if (shouldEndPlatformSession(err)) signOutPortal("platform");
    } finally {
      setPhotoBusy(false);
    }
  };

  const savePassword = async (event) => {
    event.preventDefault();
    if (passwordBusy) return;
    const nextErrors = platformPasswordIssue(password.current, password.next);
    if (Object.keys(nextErrors).length) {
      setPasswordErrors(nextErrors);
      return;
    }
    setPasswordBusy(true);
    setPasswordError("");
    try {
      await changePlatformAdminPassword(password.current, password.next);
      setPassword({ current: "", next: "" });
      push("Password changed. Sign in again.", "success");
      signOutPortal("platform");
    } catch (err) {
      const result = interpretPlatformError(err, {
        current_password: "current",
        new_password: "next",
      });
      if (result.fieldErrors.current || result.fieldErrors.next) {
        setPasswordErrors({
          current_password: result.fieldErrors.current || "",
          new_password: result.fieldErrors.next || "",
        });
      }
      setPasswordError(err?.status === 422 ? "Check the highlighted fields." : platformCallMessage(err));
      if (shouldEndPlatformSession(err)) signOutPortal("platform");
    } finally {
      setPasswordBusy(false);
    }
  };

  if ((loading || sessionLoading) && !draft && !loadError) {
    return (
      <section className="card card-pad">
        <p>Loading your profile from the server.</p>
      </section>
    );
  }

  if (!draft) {
    return (
      <section className="card card-pad">
        <p role="alert">{loadError || "Your profile could not be loaded."}</p>
      </section>
    );
  }

  return (
    <section className="profile-page">
      <header className="page-header">
        <h1>My Profile</h1>
      </header>
      <div className="profile-layout">
        <aside className="profile-card">
          <div className="profile-cover" />
          <div className="profile-avatar-wrap">
            <div className="profile-avatar">
              {photoUrl ? <img src={photoUrl} alt="" /> : <span>{initials(identity.name)}</span>}
            </div>
            <button type="button" className="profile-avatar-edit" aria-label="Upload photo" disabled={photoBusy} onClick={() => fileRef.current?.click()}>
              <Camera size={14} />
            </button>
          </div>
          <div className="profile-identity">
            <strong>{identity.name || "Platform admin"}</strong>
            <span className="profile-role">{identity.role || "platform_admin"}</span>
          </div>
          <ul className="profile-contact">
            <li><span>{identity.email || "—"}</span></li>
            <li><span>User {identity.userId ?? "—"}</span></li>
          </ul>
          <div className="profile-photo-actions">
            <Button variant="outline" size="sm" disabled={photoBusy} onClick={() => fileRef.current?.click()}>
              {photoBusy ? "Working…" : "Upload photo"}
            </Button>
            <Button variant="danger" size="sm" disabled={photoBusy || !photoUrl} onClick={removePhoto}>
              <Trash2 size={12} aria-hidden="true" /> Remove
            </Button>
          </div>
          <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" hidden onChange={uploadPhoto} />
        </aside>

        <div>
          <form className="profile-panel" onSubmit={saveProfile} noValidate>
            <header className="profile-panel-head"><h2>Contact</h2></header>
            <div className="profile-section">
              <div className="profile-grid">
                <Input className="profile-readonly" label="Email" value={identity.email} readOnly />
                <Input label="Job title" value={draft.jobTitle} error={errors.jobTitle} onChange={(event) => setField("jobTitle", event.target.value)} />
                <Input label="Phone code" value={draft.phoneCode} error={errors.phoneCode} onChange={(event) => setField("phoneCode", event.target.value)} />
                <Input label="Phone" value={draft.phone} error={errors.phone} onChange={(event) => setField("phone", event.target.value)} />
                <Input label="Address" value={draft.address} error={errors.address} onChange={(event) => setField("address", event.target.value)} />
                <Input label="City" value={draft.city} error={errors.city} onChange={(event) => setField("city", event.target.value)} />
                <Input label="State" value={draft.state} error={errors.state} onChange={(event) => setField("state", event.target.value)} />
                <Input label="Postal code" value={draft.postalCode} error={errors.postalCode} onChange={(event) => setField("postalCode", event.target.value)} />
              </div>
              {formError ? <p className="profile-alert" role="alert">{formError}</p> : null}
              {loadError ? <p className="profile-alert" role="alert">{loadError}</p> : null}
            </div>
            <footer className="profile-footer">
              <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save profile"}</Button>
            </footer>
          </form>

          <form className="profile-panel" style={{ marginTop: 16 }} onSubmit={savePassword} noValidate>
            <header className="profile-panel-head"><h2>Password</h2></header>
            <div className="profile-section">
              <p className="panel-copy">At least 8 characters, with one letter and one number. It must differ from the current password. After a change, sign in again.</p>
              <div className="profile-grid">
                <PasswordField
                  label="Current password"
                  autoComplete="current-password"
                  value={password.current}
                  error={passwordErrors.current_password}
                  onChange={(event) => {
                    setPassword((current) => ({ ...current, current: event.target.value }));
                    setPasswordErrors((current) => ({ ...current, current_password: "" }));
                    setPasswordError("");
                  }}
                />
                <PasswordField
                  label="New password"
                  autoComplete="new-password"
                  value={password.next}
                  error={passwordErrors.new_password}
                  onChange={(event) => {
                    setPassword((current) => ({ ...current, next: event.target.value }));
                    setPasswordErrors((current) => ({ ...current, new_password: "" }));
                    setPasswordError("");
                  }}
                />
              </div>
              {passwordError ? <p className="profile-alert" role="alert">{passwordError}</p> : null}
            </div>
            <footer className="profile-footer">
              <Button type="submit" disabled={passwordBusy}>{passwordBusy ? "Saving…" : "Change password"}</Button>
            </footer>
          </form>
        </div>
      </div>
    </section>
  );
}
