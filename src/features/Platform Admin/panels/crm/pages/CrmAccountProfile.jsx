import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Trash2 } from "lucide-react";
import {
  changeCrmPassword,
  getCrmProfile,
  removeCrmPhoto,
  resolveCrmImageUrl,
  updateCrmProfile,
  uploadCrmPhoto,
} from "../../../shared/api/crmAccount";
import { mapCrmProfile } from "../../../shared/api/crmAccountModel";
import { interpretPlatformError, platformCallMessage, shouldEndPlatformSession } from "../../../shared/api/platformErrors";
import { platformAuth } from "../../../shared/api/platformSession";
import {
  platformPasswordIssue,
  platformPhotoIssue,
  profileDraft,
  profileUpdateBody,
} from "../../../shared/api/platformProfileModel";
import Button from "../../../shared/components/Button";
import Input from "../../../shared/components/Input";
import PasswordField from "../../../shared/components/PasswordField";
import { usePlatform } from "../../../shared/context/PlatformContext";
import { useToast } from "../../../shared/hooks/useToast";
import { formatDate } from "../../../shared/utils/formatDate";
import { initials } from "../../../shared/utils/validation";
import "./CrmAccountProfile.css";

const PROFILE_ERROR_FIELDS = {
  phone: "phone",
  phone_code: "phoneCode",
  address: "address",
  city: "city",
  state: "state",
  postal_code: "postalCode",
  job_title: "jobTitle",
};

function showCreated(value) {
  if (!value) return "—";
  const day = String(value).slice(0, 10);
  return formatDate(`${day}T00:00:00`);
}

function rememberPhoto(photoUrl, patchPortalSession) {
  patchPortalSession("crm", { photoUrl: photoUrl || "" });
  const user = platformAuth.getUser();
  const accessToken = platformAuth.getAccessToken();
  if (!user || !accessToken) return;
  platformAuth.saveSession({
    accessToken,
    refreshToken: platformAuth.getRefreshToken(),
    user: { ...user, photoUrl: photoUrl || "" },
  });
}

export default function CrmAccountProfile() {
  const { signOutPortal, patchPortalSession } = usePlatform();
  const { push } = useToast();
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

  const applyAccount = useCallback((body) => {
    const mapped = mapCrmProfile(body);
    if (!mapped) return null;
    const next = { ...mapped, photoUrl: resolveCrmImageUrl(mapped.photoUrl) };
    setAccount(next);
    setDraft(profileDraft(next));
    setPhotoUrl(next.photoUrl);
    rememberPhoto(next.photoUrl, patchPortalSession);
    return next;
  }, [patchPortalSession]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    getCrmProfile()
      .then((body) => {
        if (cancelled) return;
        if (!applyAccount(body)) setLoadError("Profile response was not recognized.");
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(platformCallMessage(err));
        if (shouldEndPlatformSession(err)) signOutPortal("crm");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [applyAccount, signOutPortal]);

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
      const updated = await updateCrmProfile(body);
      if (!applyAccount(updated)) setFormError("Profile response was not recognized.");
      else push("Profile saved.", "success");
    } catch (err) {
      const result = interpretPlatformError(err, PROFILE_ERROR_FIELDS);
      if (Object.keys(result.fieldErrors).length) setErrors(result.fieldErrors);
      setFormError(err?.status === 422 ? "Check the highlighted fields." : platformCallMessage(err));
      if (shouldEndPlatformSession(err)) signOutPortal("crm");
    } finally {
      setSaving(false);
    }
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
      const updated = await uploadCrmPhoto(file);
      if (!applyAccount(updated)) setFormError("Profile response was not recognized.");
      else push("Photo updated.", "success");
    } catch (err) {
      setFormError(platformCallMessage(err));
      if (shouldEndPlatformSession(err)) signOutPortal("crm");
    } finally {
      setPhotoBusy(false);
    }
  };

  const removePhoto = async () => {
    if (photoBusy || !photoUrl) return;
    setPhotoBusy(true);
    setFormError("");
    try {
      const updated = await removeCrmPhoto();
      if (!applyAccount(updated)) setFormError("Profile response was not recognized.");
      else push("Photo removed.", "success");
    } catch (err) {
      if (err?.status === 404) {
        setPhotoUrl("");
        setAccount((current) => (current ? { ...current, photoUrl: "" } : current));
        rememberPhoto("", patchPortalSession);
      }
      setFormError(platformCallMessage(err));
      if (shouldEndPlatformSession(err)) signOutPortal("crm");
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
      await changeCrmPassword(password.current, password.next);
      setPassword({ current: "", next: "" });
      push("Password changed. Sign in again.", "success");
      signOutPortal("crm");
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
      setPasswordError(err?.code === "invalid_password"
        ? "Current password is incorrect."
        : (err?.status === 422 ? "Check the highlighted fields." : platformCallMessage(err)));
      if (shouldEndPlatformSession(err)) signOutPortal("crm");
    } finally {
      setPasswordBusy(false);
    }
  };

  if (loading && !draft) {
    return (
      <section className="crm-page">
        <section className="crm-card"><p className="crm-account-note">Loading your profile.</p></section>
      </section>
    );
  }

  if (!draft || !account) {
    return (
      <section className="crm-page">
        <section className="crm-card"><p className="crm-account-note" role="alert">{loadError || "Your profile could not be loaded."}</p></section>
      </section>
    );
  }

  return (
    <section className="crm-page crm-account">
      <header className="crm-account-hero">
        <div className="crm-account-avatar">
          {photoUrl ? <img src={photoUrl} alt="" /> : <span>{initials(account.name)}</span>}
          <button type="button" aria-label="Upload photo" disabled={photoBusy} onClick={() => fileRef.current?.click()}>
            <Camera size={14} />
          </button>
        </div>
        <div>
          <h2>{account.name || "CRM"}</h2>
          <p>{account.email}</p>
          <p>{account.role} · {account.isActive === false ? "Inactive" : "Active"} · Created {showCreated(account.createdAt)}</p>
        </div>
        <div className="crm-account-photo-actions">
          <Button variant="secondary" size="sm" disabled={photoBusy} onClick={() => fileRef.current?.click()}>
            {photoBusy ? "Working…" : "Upload photo"}
          </Button>
          <Button variant="secondary" size="sm" disabled={photoBusy || !photoUrl} onClick={removePhoto}>
            <Trash2 size={14} aria-hidden="true" /> Remove photo
          </Button>
        </div>
        <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" hidden onChange={uploadPhoto} />
      </header>

      <form className="crm-card" onSubmit={saveProfile} noValidate>
        <header className="crm-card-head"><div><h2>Contact</h2><p>Email is shown here and cannot be changed.</p></div></header>
        <div className="crm-account-grid">
          <Input label="Email" value={account.email} readOnly />
          <Input label="Job title" value={draft.jobTitle} error={errors.jobTitle} maxLength={120} onChange={(event) => setField("jobTitle", event.target.value)} />
          <Input label="Phone code" value={draft.phoneCode} error={errors.phoneCode} maxLength={10} onChange={(event) => setField("phoneCode", event.target.value)} />
          <Input label="Phone" value={draft.phone} error={errors.phone} maxLength={20} onChange={(event) => setField("phone", event.target.value)} />
          <Input label="Address" value={draft.address} error={errors.address} onChange={(event) => setField("address", event.target.value)} />
          <Input label="City" value={draft.city} error={errors.city} maxLength={100} onChange={(event) => setField("city", event.target.value)} />
          <Input label="State" value={draft.state} error={errors.state} maxLength={100} onChange={(event) => setField("state", event.target.value)} />
          <Input label="Postal code" value={draft.postalCode} error={errors.postalCode} maxLength={20} onChange={(event) => setField("postalCode", event.target.value)} />
        </div>
        {formError ? <p className="crm-account-alert" role="alert">{formError}</p> : null}
        <footer className="crm-account-actions">
          <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save profile"}</Button>
        </footer>
      </form>

      <form className="crm-card" onSubmit={savePassword} noValidate>
        <header className="crm-card-head">
          <div>
            <h2>Password</h2>
            <p>At least 8 characters, with one letter and one number, and different from the current password. After a change, sign in again.</p>
          </div>
        </header>
        <div className="crm-account-grid">
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
        {passwordError ? <p className="crm-account-alert" role="alert">{passwordError}</p> : null}
        <footer className="crm-account-actions">
          <Button type="submit" disabled={passwordBusy}>{passwordBusy ? "Saving…" : "Change password"}</Button>
        </footer>
      </form>
    </section>
  );
}
