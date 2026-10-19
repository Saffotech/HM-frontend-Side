import { useEffect, useId, useRef, useState } from "react";
import { AlertCircle, Camera, Crop, Loader2, Lock, Trash2, Undo2 } from "lucide-react";
import Button from "../../components/Button";
import Input from "../../components/Input";
import Modal from "../../components/Modal";
import { confirmDiscard } from "../../hooks/useUnsavedChanges";
import {
  PROFILE_PHOTO_TYPES,
  profilePhotoIssue,
} from "../../services/portalAccount";
import { isPhone } from "../../utils/validation";
import AvatarImage from "./AvatarImage";
import PhotoCropper from "./PhotoCropper";

const TEXT_FIELDS = ["phone", "jobTitle", "department"];
const TEXT_LIMIT = 60;
const NO_PHOTO_CHANGE = { file: null, preview: "", remove: false, original: null };

/** @param {{ phone: string, jobTitle: string, department: string }} draft */
function fieldErrors(draft) {
  const errors = {};
  if (draft.phone.trim() && !isPhone(draft.phone)) errors.phone = "Enter a valid phone number, e.g. +91 98765 43210.";
  if (draft.jobTitle.trim().length > TEXT_LIMIT) errors.jobTitle = `Use ${TEXT_LIMIT} characters or fewer.`;
  if (draft.department.trim().length > TEXT_LIMIT) errors.department = `Use ${TEXT_LIMIT} characters or fewer.`;
  return errors;
}

export default function EditProfileDialog({ profile, onDirtyChange, onClose }) {
  const [draft, setDraft] = useState(() => Object.fromEntries(TEXT_FIELDS.map((key) => [key, profile[key] || ""])));
  const [photo, setPhoto] = useState(NO_PHOTO_CHANGE);
  const [crop, setCrop] = useState(null);
  const [errors, setErrors] = useState({});
  const [photoError, setPhotoError] = useState("");
  const [formError, setFormError] = useState("");
  const busy = false;
  const fileRef = useRef(null);
  const formId = useId();
  const photoHintId = useId();

  const textDirty = TEXT_FIELDS.some((key) => draft[key] !== (profile[key] || ""));
  const dirty = textDirty || Boolean(photo.file) || photo.remove || Boolean(crop);

  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);

  useEffect(() => () => {
    if (photo.preview) URL.revokeObjectURL(photo.preview);
  }, [photo.preview]);

  useEffect(() => () => {
    if (crop?.url) URL.revokeObjectURL(crop.url);
  }, [crop?.url]);

  const requestClose = () => {
    if (busy) return;
    if (confirmDiscard(dirty)) onClose(false);
  };

  const set = (key) => (event) => {
    setDraft((current) => ({ ...current, [key]: event.target.value }));
    setErrors((current) => ({ ...current, [key]: "" }));
    setFormError("");
  };

  const choosePhoto = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const issue = profilePhotoIssue(file);
    setFormError("");
    if (issue) {
      setPhotoError(issue);
      return;
    }
    setPhotoError("");
    openCropper(file);
  };

  const openCropper = (file) => {
    setCrop({ url: URL.createObjectURL(file), name: file.name, type: file.type, original: file });
  };

  const applyCrop = (file) => {
    setPhoto({ file, preview: URL.createObjectURL(file), remove: false, original: crop.original });
    setCrop(null);
  };

  const unreadablePhoto = () => {
    setPhoto(NO_PHOTO_CHANGE);
    setPhotoError("That image couldn't be read. Choose another file.");
  };

  const cropFailed = () => {
    setCrop(null);
    unreadablePhoto();
  };

  const shownPhoto = photo.remove ? "" : photo.preview || profile.photoUrl;
  const photoStatus = busy && (photo.file || photo.remove)
    ? (photo.file ? "Uploading photo…" : "Removing photo…")
    : photo.file ? `${photo.file.name} — preview, not saved yet`
      : photo.remove ? "Photo will be removed when you save"
        : "JPEG, PNG or WebP, up to 2 MB.";

  const submit = async (event) => {
    event.preventDefault();
    if (busy || !dirty) return;
    const nextErrors = fieldErrors(draft);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setFormError("Profile updates are not available. There is no portal profile API.");
  };

  return (
    <Modal
      open
      title="Edit profile"
      subtitle="Update your photo and contact details."
      onClose={requestClose}
      footer={(
        <>
          <Button variant="secondary" onClick={requestClose} disabled={busy}>Cancel</Button>
          <Button type="submit" form={formId} disabled={busy || !dirty || Boolean(crop)}>
            {busy ? <><Loader2 size={15} className="pp-spin" aria-hidden="true" />Saving…</> : "Save changes"}
          </Button>
        </>
      )}
    >
      <form id={formId} className="pp-edit" noValidate onSubmit={submit}>
        {formError && <p className="pp-alert pp-alert-error" role="alert"><AlertCircle size={15} aria-hidden="true" />{formError}</p>}

        {crop ? (
          <div className="pp-photo pp-photo-cropping">
            <div className="pp-photo-copy">
              <strong>Adjust your photo</strong>
              <span>Drag to position it inside the circle and zoom to fit.</span>
            </div>
            <PhotoCropper source={crop} onApply={applyCrop} onCancel={() => setCrop(null)} onError={cropFailed} />
          </div>
        ) : (
          <div className="pp-photo">
            <div className={`pp-avatar pp-avatar-xl${photo.file ? " is-preview" : ""}`}>
              <AvatarImage photo={shownPhoto} name={profile.name} onError={photo.file ? unreadablePhoto : undefined} />
            </div>
            <div className="pp-photo-copy">
              <strong>Profile photo</strong>
              <span id={photoHintId} aria-live="polite">{photoStatus}</span>
              {photoError && <span className="field-error" role="alert">{photoError}</span>}
              <div className="pp-photo-actions">
                <Button size="sm" variant="secondary" disabled={busy} onClick={() => fileRef.current?.click()} aria-describedby={photoHintId}>
                  <Camera size={14} aria-hidden="true" />{shownPhoto ? "Replace photo" : "Upload photo"}
                </Button>
                {photo.original && (
                  <Button size="sm" variant="secondary" disabled={busy} onClick={() => openCropper(photo.original)}>
                    <Crop size={14} aria-hidden="true" />Adjust
                  </Button>
                )}
                {photo.file && (
                  <Button size="sm" variant="secondary" disabled={busy} onClick={() => setPhoto(NO_PHOTO_CHANGE)}>
                    <Undo2 size={14} aria-hidden="true" />Discard
                  </Button>
                )}
                {!photo.file && profile.photoUrl && !photo.remove && (
                  <Button size="sm" variant="secondary" className="pp-danger-btn" disabled={busy} onClick={() => setPhoto({ ...NO_PHOTO_CHANGE, remove: true })}>
                    <Trash2 size={14} aria-hidden="true" />Remove
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept={PROFILE_PHOTO_TYPES.join(",")}
          className="pp-file"
          tabIndex={-1}
          aria-label="Choose a profile photo"
          onChange={choosePhoto}
        />

        <div className="pp-edit-grid">
          <Input label="Full name" value={profile.name} disabled readOnly className="pp-locked" />
          <Input label="Email address" type="email" value={profile.email} disabled readOnly className="pp-locked" />
          <p className="pp-locked-note"><Lock size={12} aria-hidden="true" />Name and email are managed by your administrator.</p>
          <Input
            label="Phone number"
            type="tel"
            autoComplete="tel"
            placeholder="+91 98765 43210"
            value={draft.phone}
            error={errors.phone}
            onChange={set("phone")}
            disabled={busy}
            aria-invalid={Boolean(errors.phone)}
          />
          <Input
            label="Job title"
            placeholder="Your job title"
            value={draft.jobTitle}
            error={errors.jobTitle}
            onChange={set("jobTitle")}
            disabled={busy}
            aria-invalid={Boolean(errors.jobTitle)}
          />
          <Input
            label="Department"
            placeholder="Your team or department"
            value={draft.department}
            error={errors.department}
            onChange={set("department")}
            disabled={busy}
            aria-invalid={Boolean(errors.department)}
            className="pp-span"
          />
        </div>
      </form>
    </Modal>
  );
}
