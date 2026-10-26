import { useEffect, useId, useRef, useState } from "react";
import { AlertCircle, Loader2, Lock } from "lucide-react";
import { interpretPlatformError, platformCallMessage } from "../../api/platformErrors";
import {
  PROFILE_ERROR_FIELDS,
  profileDraft,
  profileFieldErrors,
  profileUpdateBody,
} from "../../api/platformProfileModel";
import Button from "../../components/Button";
import Input from "../../components/Input";
import Modal from "../../components/Modal";
import { confirmDiscard } from "../../hooks/useUnsavedChanges";

const FIELDS = ["jobTitle", "phoneCode", "phone", "address", "city", "state", "postalCode"];

export default function EditProfileDialog({ profile, onDirtyChange, onClose, onSubmit }) {
  const [draft, setDraft] = useState(() => profileDraft(profile));
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const formId = useId();
  const dirty = Object.keys(profileUpdateBody(profile, draft)).length > 0;

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  const requestClose = () => {
    if (savingRef.current) return;
    if (confirmDiscard(dirty)) onClose();
  };

  const set = (key) => (event) => {
    setDraft((current) => ({ ...current, [key]: event.target.value }));
    setErrors((current) => ({ ...current, [key]: "" }));
    setFormError("");
  };

  const submit = async (event) => {
    event.preventDefault();
    if (savingRef.current) return;
    const nextErrors = profileFieldErrors(draft);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    if (!dirty) {
      setFormError("No changes to save.");
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setFormError("");
    try {
      await onSubmit(draft);
      onClose();
    } catch (error) {
      const result = interpretPlatformError(error, PROFILE_ERROR_FIELDS);
      if (Object.keys(result.fieldErrors).length) {
        setErrors((current) => ({ ...current, ...result.fieldErrors }));
      }
      setFormError(error?.status === 422 ? "Check the highlighted fields." : platformCallMessage(error));
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      size="lg"
      title="Edit profile"
      subtitle="Update the contact details this account is allowed to change."
      onClose={requestClose}
      footer={(
        <>
          <Button variant="secondary" onClick={requestClose} disabled={saving}>Cancel</Button>
          <Button type="submit" form={formId} disabled={saving || !dirty}>
            {saving ? <><Loader2 size={15} className="pp-spin" aria-hidden="true" />Saving…</> : "Save changes"}
          </Button>
        </>
      )}
    >
      <form id={formId} className="pp-edit" noValidate onSubmit={submit}>
        {formError ? (
          <p className="pp-alert pp-alert-error" role="alert">
            <AlertCircle size={15} aria-hidden="true" />{formError}
          </p>
        ) : null}
        <div className="pp-edit-grid">
          <Input label="Full name" value={profile.name || ""} disabled readOnly className="pp-locked" />
          <Input label="Email address" type="email" value={profile.email || ""} disabled readOnly className="pp-locked" />
          <p className="pp-locked-note">
            <Lock size={12} aria-hidden="true" />
            Name, email, and role are not editable on this form.
          </p>
          {FIELDS.map((key) => (
            <ProfileField
              key={key}
              name={key}
              value={draft[key]}
              error={errors[key]}
              disabled={saving}
              onChange={set(key)}
            />
          ))}
        </div>
      </form>
    </Modal>
  );
}

function ProfileField({ name, value, error, disabled, onChange }) {
  const fields = {
    jobTitle: { label: "Job title", autoComplete: "organization-title", maxLength: 120 },
    phoneCode: { label: "Phone code", autoComplete: "tel-country-code", maxLength: 10 },
    phone: { label: "Phone number", type: "tel", inputMode: "tel", autoComplete: "tel", maxLength: 20 },
    address: { label: "Address", autoComplete: "street-address", className: "pp-span" },
    city: { label: "City", autoComplete: "address-level2", maxLength: 100 },
    state: { label: "State", autoComplete: "address-level1", maxLength: 100 },
    postalCode: { label: "Postal code", autoComplete: "postal-code", maxLength: 20 },
  };
  const field = fields[name];
  return (
    <Input
      label={field.label}
      type={field.type || "text"}
      inputMode={field.inputMode}
      autoComplete={field.autoComplete}
      maxLength={field.maxLength}
      value={value}
      error={error}
      onChange={onChange}
      disabled={disabled}
      aria-invalid={Boolean(error)}
      className={field.className || ""}
    />
  );
}
