/**
 * Lab Technician Profile — live GET/PUT /lab/profile + image APIs.
 * Admin-owned fields stay read-only.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import LabLayout from '@/features/lab/components/LabLayout';
import {
  ArrowLeft,
  Briefcase,
  Edit3,
  Phone,
  Shield,
  Trash2,
  Upload,
  User,
  X,
} from 'lucide-react';
import {
  LAB_TECHNICIAN_PROFILE_EDITABLE_TOP_KEYS,
  resolveLabTechnicianProfileImageUrl,
} from '@/features/lab/api/profile';
import {
  useDeleteLabTechnicianProfileImageMutation,
  useLabTechnicianProfileQuery,
  useUpdateLabTechnicianProfileMutation,
  useUploadLabTechnicianProfileImageMutation,
} from '@/features/lab/hooks/useLabTechnicianProfileQuery';
import { useLabPermissionSet } from '@/features/lab/hooks/useLabPermission';
import { ROUTES } from '@/shared/constants';
import { Button, ConfirmDialog, EmptyState, ProfilePhotoCropDialog } from '@/shared/components/common';
import PageSpinner from '@/shared/components/PageSpinner';
import { toast } from '@/shared/utils/toast';
import {
  isLabDepartmentUnassignedError,
  LAB_DEPT_UNASSIGNED_MESSAGE,
} from '@/shared/utils/labDepartments';
import { formatPhoneInput } from '@/shared/utils/validators';
import {
  capitalizeFirst,
  displayProfileText,
  parseProfileLanguages,
} from '@/shared/utils/profileTextFormat';
import './LabProfilePage.css';

const GENDER_OPTIONS = [
  { value: 1, label: 'Male' },
  { value: 2, label: 'Female' },
  { value: 3, label: 'Other' },
  { value: 4, label: 'Prefer not to say' },
];

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const TEN_DIGIT_PHONE = /^\d{10}$/;
const VALID_GENDER_VALUES = GENDER_OPTIONS.map((o) => o.value);
const PROFILE_TABS = new Set(['account', 'professional', 'contact']);

/** Nurse Phase 2 by Atharva — phone / emergency phone must be exactly 10 digits */
function isStrictTenDigitPhone(value) {
  return TEN_DIGIT_PHONE.test(String(value ?? '').trim());
}

function isValidGender(value) {
  return VALID_GENDER_VALUES.includes(Number(value));
}

function genderLabel(code) {
  return GENDER_OPTIONS.find((o) => o.value === code)?.label ?? null;
}

function fmtShift(shift) {
  if (!shift) return null;
  const name = shift.name || null;
  const start = shift.start_time || null;
  const end = shift.end_time || null;
  if (start && end) {
    return name ? `${name} · ${start} – ${end}` : `${start} – ${end}`;
  }
  return name;
}

/** Nurse Phase 2 by Atharva — relative “updated ago” for hero status */
function formatUpdatedAgo(iso) {
  if (!iso) return null;
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return null;
  const diffMs = Date.now() - then.getTime();
  if (diffMs < 0) return 'just now';
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  return then.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function buildEditableForm(profile) {
  return {
    qualification: capitalizeFirst(profile?.qualification ?? ''),
    license_number: capitalizeFirst(profile?.license_number ?? ''),
    experience_years:
      profile?.experience_years === null || profile?.experience_years === undefined
        ? ''
        : String(profile.experience_years),
    bio: capitalizeFirst(profile?.bio ?? ''),
    languages: Array.isArray(profile?.languages)
      ? profile.languages.map((l) => capitalizeFirst(l)).join(', ')
      : '',
    phone: formatPhoneInput(profile?.phone ?? ''),
    phone_code: profile?.phone_code ?? '+91',
    address_line: capitalizeFirst(profile?.address?.line ?? ''),
    city: capitalizeFirst(profile?.address?.city ?? ''),
    state: capitalizeFirst(profile?.address?.state ?? ''),
    country: capitalizeFirst(profile?.address?.country ?? ''),
    postal_code: capitalizeFirst(profile?.address?.postal_code ?? ''),
    date_of_birth: profile?.date_of_birth ?? '',
    gender: profile?.gender ?? '',
    emergency_contact_name: capitalizeFirst(profile?.emergency_contact?.name ?? ''),
    emergency_contact_phone: formatPhoneInput(profile?.emergency_contact?.phone ?? ''),
  };
}

/**
 * Nurse Phase 2 by Atharva —
 * Build dirty PUT payload only for editable fields; nest address / emergency_contact.
 */
function buildDirtyPayload(form, baseline) {
  const payload = {};

  LAB_TECHNICIAN_PROFILE_EDITABLE_TOP_KEYS.forEach((key) => {
    if (key === 'languages') {
      const next = parseProfileLanguages(form.languages);
      const prev = Array.isArray(baseline.languages) ? baseline.languages : [];
      if (JSON.stringify(next) !== JSON.stringify(prev)) payload.languages = next;
      return;
    }
    if (key === 'experience_years') {
      const next =
        form.experience_years === '' || form.experience_years === null
          ? null
          : Number(form.experience_years);
      const prev = baseline.experience_years ?? null;
      if (next !== prev) payload.experience_years = next;
      return;
    }
    if (key === 'gender') {
      const next = form.gender === '' || form.gender === null ? null : Number(form.gender);
      const prev = baseline.gender ?? null;
      if (next !== prev) payload.gender = next;
      return;
    }
    if (key === 'phone' || key === 'phone_code' || key === 'date_of_birth') {
      const next = form[key] === '' ? null : form[key];
      const prev = baseline[key] ?? null;
      if ((next ?? null) !== (prev ?? null)) payload[key] = next;
      return;
    }
    if (key === 'qualification' || key === 'license_number' || key === 'bio') {
      const next = form[key] === '' ? null : capitalizeFirst(form[key]);
      const prev = baseline[key] ?? null;
      if ((next ?? null) !== (prev ?? null)) payload[key] = next;
    }
  });

  const nextAddress = {
    line: form.address_line === '' ? null : capitalizeFirst(form.address_line),
    city: form.city === '' ? null : capitalizeFirst(form.city),
    state: form.state === '' ? null : capitalizeFirst(form.state),
    country: form.country === '' ? null : capitalizeFirst(form.country),
    postal_code: form.postal_code === '' ? null : capitalizeFirst(form.postal_code),
  };
  const prevAddress = baseline.address || {};
  const addressChanged =
    (nextAddress.line ?? null) !== (prevAddress.line ?? null) ||
    (nextAddress.city ?? null) !== (prevAddress.city ?? null) ||
    (nextAddress.state ?? null) !== (prevAddress.state ?? null) ||
    (nextAddress.country ?? null) !== (prevAddress.country ?? null) ||
    (nextAddress.postal_code ?? null) !== (prevAddress.postal_code ?? null);
  if (addressChanged) payload.address = nextAddress;

  const nextEmergency = {
    name:
      form.emergency_contact_name === ''
        ? null
        : capitalizeFirst(form.emergency_contact_name),
    phone: form.emergency_contact_phone === '' ? null : form.emergency_contact_phone,
  };
  const prevEmergency = baseline.emergency_contact || {};
  const emergencyChanged =
    (nextEmergency.name ?? null) !== (prevEmergency.name ?? null) ||
    (nextEmergency.phone ?? null) !== (prevEmergency.phone ?? null);
  if (emergencyChanged) payload.emergency_contact = nextEmergency;

  return payload;
}

function ReadField({ label, value }) {
  const display = displayProfileText(value);
  return (
    <div className="lab-profile-field">
      <span className="lab-profile-field__label">{label}</span>
      <p
        className={`lab-profile-field__value${!display ? ' lab-profile-field__value--empty' : ''}`}
      >
        {display || 'Not set'}
      </p>
    </div>
  );
}

export default function LabProfilePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    canViewProfile,
    canUpdateProfile,
    canUploadProfileImage,
    canDeleteProfileImage,
  } = useLabPermissionSet();
  const { data, isLoading, isError, error, refetch } = useLabTechnicianProfileQuery({
    enabled: canViewProfile,
  });
  const profile = data?.profile;
  const updateProfile = useUpdateLabTechnicianProfileMutation();
  const uploadImage = useUploadLabTechnicianProfileImageMutation();
  const deleteImage = useDeleteLabTechnicianProfileImageMutation();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [langDraft, setLangDraft] = useState('');
  // Nurse Phase 2 by Atharva — tabs: show one section at a time; Account default
  const [activeTab, setActiveTab] = useState(() => {
    const tab = location.state?.labProfileTab;
    if (tab === 'shift') return 'account';
    return PROFILE_TABS.has(tab) ? tab : 'account';
  });
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const [removePhotoConfirmOpen, setRemovePhotoConfirmOpen] = useState(false);
  const [cropFile, setCropFile] = useState(null);
  const [cropUploading, setCropUploading] = useState(false);
  const avatarWrapRef = useRef(null);
  const fileInputRef = useRef(null);

  const startEdit = () => {
    if (!canUpdateProfile) {
      toast.error('You do not have permission to update profile');
      return;
    }
    // Nurse Phase 2 by Atharva — Account is read-only; edit opens Professional
    setEditing(true);
    if (activeTab === 'account') setActiveTab('professional');
  };

  useEffect(() => {
    if (profile && !editing) {
      setForm(buildEditableForm(profile));
    }
  }, [profile, editing]);

  // Nurse Phase 2 by Atharva — honor deep-link tab from notifications
  useEffect(() => {
    const tab = location.state?.labProfileTab;
    if (tab === 'shift' || tab === 'account') setActiveTab('account');
    else if (PROFILE_TABS.has(tab)) setActiveTab(tab);
  }, [location.state]);

  // Nurse Phase 2 by Atharva — close avatar menu on outside click / Escape
  useEffect(() => {
    if (!avatarMenuOpen) return undefined;
    const onPointerDown = (e) => {
      if (avatarWrapRef.current && !avatarWrapRef.current.contains(e.target)) {
        setAvatarMenuOpen(false);
      }
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setAvatarMenuOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [avatarMenuOpen]);

  const displayName = useMemo(() => {
    if (!profile) return 'Lab Technician';
    const name = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email;
    return displayProfileText(name);
  }, [profile]);

  const imageUrl = resolveLabTechnicianProfileImageUrl(profile?.profile_image_url);

  const completionPct = Math.min(
    100,
    Math.max(0, Number(profile?.profile_completion_percentage) || 0)
  );

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const setTextField = (key, value) => {
    setField(key, capitalizeFirst(value));
  };

  const handleCancel = () => {
    setForm(buildEditableForm(profile));
    setEditing(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!canUpdateProfile) {
      toast.error('You do not have permission to update profile');
      return;
    }

    // Phone is optional; if entered it must be exactly 10 digits.
    const phone = formatPhoneInput(form?.phone);
    const emergencyPhone = formatPhoneInput(form?.emergency_contact_phone);
    if (phone && !isStrictTenDigitPhone(phone)) {
      toast.error('Phone must be a 10-digit number');
      setActiveTab('contact');
      return;
    }
    if (emergencyPhone && !isStrictTenDigitPhone(emergencyPhone)) {
      toast.error('Emergency phone must be a 10-digit number');
      setActiveTab('contact');
      return;
    }
    if (form?.gender !== '' && form?.gender != null && !isValidGender(form.gender)) {
      toast.error('Please select a valid gender');
      setActiveTab('contact');
      return;
    }

    const formForSave = {
      ...form,
      phone,
      emergency_contact_phone: emergencyPhone,
      gender: form.gender === '' || form.gender == null ? '' : Number(form.gender),
    };
    const payload = buildDirtyPayload(formForSave, profile);
    if (Object.keys(payload).length === 0) {
      toast.info('No changes to save');
      setEditing(false);
      return;
    }
    if (
      payload.experience_years != null &&
      (payload.experience_years < 0 || payload.experience_years > 60)
    ) {
      toast.error('Experience years must be between 0 and 60');
      return;
    }
    try {
      await updateProfile.mutateAsync(payload);
      toast.success('Profile updated');
      setEditing(false);
    } catch {
      /* toasted */
    }
  };

  const handleImageChange = (e) => {
    if (!canUploadProfileImage) {
      toast.error('You do not have permission to upload profile image');
      return;
    }
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type) && !/\.(jpe?g|png|webp)$/i.test(file.name)) {
      toast.error('Use a JPG, PNG, or WebP image');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error('Image must be 5 MB or smaller');
      return;
    }
    setCropFile(file);
  };

  const handleCropConfirm = async (croppedFile) => {
    if (!canUploadProfileImage) {
      toast.error('You do not have permission to upload profile image');
      return;
    }
    setCropUploading(true);
    try {
      await uploadImage.mutateAsync(croppedFile);
      setCropFile(null);
      toast.success('Profile image uploaded');
    } catch {
      /* toasted */
    } finally {
      setCropUploading(false);
    }
  };

  const handleDeleteImage = async () => {
    if (!canDeleteProfileImage) {
      toast.error('You do not have permission to delete profile image');
      return;
    }
    try {
      await deleteImage.mutateAsync();
      toast.success('Profile image removed');
      setRemovePhotoConfirmOpen(false);
    } catch {
      /* toasted */
    }
  };

  const handleAvatarUploadClick = () => {
    if (!canUploadProfileImage) {
      toast.error('You do not have permission to upload profile image');
      return;
    }
    setAvatarMenuOpen(false);
    fileInputRef.current?.click();
  };

  // Nurse Phase 2 by Atharva — ask confirm before deleting profile photo
  const handleAvatarRemoveClick = () => {
    if (!canDeleteProfileImage) {
      toast.error('You do not have permission to delete profile image');
      return;
    }
    setAvatarMenuOpen(false);
    setRemovePhotoConfirmOpen(true);
  };

  const addLanguageChip = () => {
    const next = capitalizeFirst(langDraft.trim());
    if (!next) return;
    const list = parseProfileLanguages(form.languages);
    if (!list.some((l) => l.toLowerCase() === next.toLowerCase())) {
      setField('languages', [...list, next].join(', '));
    }
    setLangDraft('');
  };

  const removeLanguage = (lang) => {
    setField(
      'languages',
      parseProfileLanguages(form.languages)
        .filter((l) => l.toLowerCase() !== lang.toLowerCase())
        .join(', ')
    );
  };

  if (!canViewProfile) {
    return (
      <LabLayout pageTitle="My Profile">
        <EmptyState
          icon={User}
          title="Profile access denied"
          description="You do not have permission to view the lab technician profile."
        />
        <div style={{ marginTop: '1rem' }}>
          <Button variant="outline" onClick={() => navigate(ROUTES.LAB_DASHBOARD)}>
            <ArrowLeft size={16} /> Back to dashboard
          </Button>
        </div>
      </LabLayout>
    );
  }

  if (isLoading) {
    return (
      <LabLayout pageTitle="My Profile">
        <PageSpinner />
      </LabLayout>
    );
  }

  if (isError) {
    return (
      <LabLayout pageTitle="My Profile">
        <EmptyState
          icon={User}
          title="Could not load profile"
          description={
            isLabDepartmentUnassignedError(error)
              ? LAB_DEPT_UNASSIGNED_MESSAGE
              : error?.message
                || (error?.status === 403
                  ? "You don't have permission to view this profile."
                  : error?.status === 404
                    ? 'Could not load your account details. Try again.'
                    : 'Something went wrong. Please try again.')
          }
        />
        <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Button variant="primary" onClick={() => refetch()}>
            Try again
          </Button>
          <Button variant="outline" onClick={() => navigate(ROUTES.LAB_DASHBOARD)}>
            <ArrowLeft size={16} /> Back to dashboard
          </Button>
        </div>
      </LabLayout>
    );
  }

  if (!profile) {
    return (
      <LabLayout pageTitle="My Profile">
        <EmptyState
          icon={User}
          title="Lab technician profile not found"
          description="Contact admin to create your lab technician profile."
        />
        <div style={{ marginTop: '1rem' }}>
          <Button variant="outline" onClick={() => navigate(ROUTES.LAB_DASHBOARD)}>
            <ArrowLeft size={16} /> Back to dashboard
          </Button>
        </div>
      </LabLayout>
    );
  }

  const saving = updateProfile.isPending;
  const hasProfileImage = Boolean(profile.profile_image_url || imageUrl);
  const canManageAvatar = canUploadProfileImage || canDeleteProfileImage;
  const departmentName =
    typeof profile.department === 'object' ? profile.department?.name : profile.department;
  const roleName = typeof profile.role === 'object' ? profile.role?.name : profile.role;

  return (
    <LabLayout pageTitle="My Profile">
      <div className="lab-profile-page">
        <div className="lab-profile-card">
          <div className="lab-profile-hero">
            <div className="lab-profile-avatar-wrap" ref={avatarWrapRef}>
              <button
                type="button"
                className="lab-profile-avatar-trigger"
                onClick={() => {
                  if (!canManageAvatar) {
                    toast.error('You do not have permission to change profile photo');
                    return;
                  }
                  setAvatarMenuOpen((open) => !open);
                }}
                aria-expanded={avatarMenuOpen}
                aria-haspopup="menu"
                aria-label="Profile photo options"
                title={
                  canManageAvatar
                    ? 'Profile photo options'
                    : 'You do not have permission to change profile photo'
                }
                style={
                  !canManageAvatar
                    ? { cursor: 'not-allowed', opacity: 0.85 }
                    : undefined
                }
              >
                {imageUrl ? (
                  <img src={imageUrl} alt="" className="lab-profile-avatar-img" />
                ) : (
                  <div className="lab-profile-avatar-fallback" aria-hidden>
                    {(profile.first_name || 'L').charAt(0).toUpperCase()}
                  </div>
                )}
              </button>

              {avatarMenuOpen && canManageAvatar ? (
                <div className="lab-profile-avatar-menu" role="menu">
                  <button
                    type="button"
                    role="menuitem"
                    className="lab-profile-avatar-menu__item"
                    onClick={handleAvatarUploadClick}
                    disabled={!canUploadProfileImage || uploadImage.isPending}
                    title={
                      canUploadProfileImage
                        ? 'Upload photo'
                        : 'You do not have permission'
                    }
                  >
                    <Upload size={14} aria-hidden />
                    {uploadImage.isPending ? 'Uploading…' : 'Upload'}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="lab-profile-avatar-menu__item lab-profile-avatar-menu__item--danger"
                    onClick={handleAvatarRemoveClick}
                    disabled={
                      !canDeleteProfileImage || deleteImage.isPending || !hasProfileImage
                    }
                    title={
                      canDeleteProfileImage
                        ? 'Remove photo'
                        : 'You do not have permission'
                    }
                  >
                    <Trash2 size={14} aria-hidden />
                    {deleteImage.isPending ? 'Removing…' : 'Remove'}
                  </button>
                </div>
              ) : null}

              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                hidden
                onChange={handleImageChange}
                disabled={uploadImage.isPending}
              />
            </div>
            <div className="lab-profile-hero__meta">
              <div className="lab-profile-hero__top">
                <div>
                  <h2 className="lab-profile-hero__name">{displayName}</h2>
                  <p className="lab-profile-hero__sub">{profile.email}</p>
                </div>
              </div>
              <div className="lab-profile-hero__tags">
                {departmentName ? (
                  <span className="lab-profile-tag">{departmentName}</span>
                ) : null}
                {roleName ? <span className="lab-profile-tag">{roleName}</span> : null}
                <span
                  className={`lab-profile-tag ${
                    profile.is_profile_completed
                      ? 'lab-profile-tag--ok'
                      : 'lab-profile-tag--warn'
                  }`}
                >
                  {profile.is_profile_completed ? 'Profile complete' : 'Incomplete'}
                </span>
                {profile.is_active ? (
                  <span className="lab-profile-tag lab-profile-tag--ok">Active</span>
                ) : (
                  <span className="lab-profile-tag lab-profile-tag--warn">Inactive</span>
                )}
              </div>
              {/* Nurse Phase 2 by Atharva — completion progress + updated ago side by side */}
              <div className="lab-profile-hero__status-row">
                <div
                  className="lab-profile-progress"
                  role="progressbar"
                  aria-valuenow={completionPct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Profile completion"
                >
                  <div className="lab-profile-progress__track">
                    <div
                      className="lab-profile-progress__fill"
                      style={{ width: `${completionPct}%` }}
                    />
                  </div>
                  <span className="lab-profile-progress__label">{completionPct}% complete</span>
                </div>
                {formatUpdatedAgo(profile.updated_at) ? (
                  <p className="lab-profile-hero__updated">
                    Profile updated {formatUpdatedAgo(profile.updated_at)}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          {/* Nurse Phase 2 by Atharva — tabs: one section visible; Account default */}
          <div className="lab-profile-page__toolbar">
            <div className="lab-profile-tabs" role="tablist" aria-label="Profile sections">
              {[
                { id: 'account', label: 'Account', icon: Shield },
                { id: 'professional', label: 'Professional', icon: Briefcase },
                { id: 'contact', label: 'Contact', icon: Phone },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === tab.id}
                    className={`lab-profile-tab${activeTab === tab.id ? ' is-active' : ''}`}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    <Icon size={15} aria-hidden />
                    {tab.label}
                  </button>
                );
              })}
            </div>
            <div className="lab-profile-page__actions">
              {editing ? (
                <>
                  <Button variant="outline" size="sm" onClick={handleCancel} disabled={saving}>
                    <X size={16} /> Cancel
                  </Button>
                  <Button
                    size="sm"
                    type="button"
                    disabled={saving || activeTab === 'account' || !canUpdateProfile}
                    title={
                      canUpdateProfile ? 'Save changes' : 'You do not have permission'
                    }
                    onClick={() => {
                      if (!canUpdateProfile) {
                        toast.error('You do not have permission to update profile');
                        return;
                      }
                      document.getElementById('lab-profile-form')?.requestSubmit();
                    }}
                  >
                    {saving ? 'Saving…' : 'Save changes'}
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  onClick={startEdit}
                  disabled={!canUpdateProfile}
                  title={
                    canUpdateProfile ? 'Edit profile' : 'You do not have permission'
                  }
                >
                  <Edit3 size={16} /> Edit profile
                </Button>
              )}
            </div>
          </div>

          <form id="lab-profile-form" className="lab-profile-body" onSubmit={handleSave}>
            {activeTab === 'account' && (
              <section
                id="lab-profile-section-account"
                className="lab-profile-section is-active"
                role="tabpanel"
              >
                <h3 className="lab-profile-section__title">
                  <Shield size={16} aria-hidden /> Account
                </h3>
                <p className="lab-profile-hint">
                  Employee ID, license number, department, and shift are managed by admin.
                </p>
                <div className="lab-profile-grid">
                  <ReadField label="First name" value={profile.first_name} />
                  <ReadField label="Last name" value={profile.last_name} />
                  <ReadField label="Email" value={profile.email} />
                  <ReadField label="Employee ID" value={profile.employee_id} />
                  <ReadField label="License number" value={profile.license_number} />
                  <ReadField label="Joining date" value={profile.joining_date} />
                  <ReadField label="Department" value={departmentName} />
                  <ReadField label="Role" value={roleName} />
                  <ReadField label="Shift" value={fmtShift(profile.shift)} />
                  <ReadField label="Shift start" value={profile.shift?.start_time} />
                  <ReadField label="Shift end" value={profile.shift?.end_time} />
                </div>
              </section>
            )}

            {activeTab === 'professional' && (
              <section
                id="lab-profile-section-professional"
                className="lab-profile-section is-active"
                role="tabpanel"
              >
                <h3 className="lab-profile-section__title">
                  <Briefcase size={16} aria-hidden /> Professional
                </h3>
                <div className="lab-profile-grid">
                  {editing && form ? (
                    <>
                      <label className="lab-profile-field">
                        <span className="lab-profile-field__label">Qualification</span>
                        <input
                          className="lab-profile-input"
                          value={form.qualification}
                          maxLength={255}
                          onChange={(e) => setTextField('qualification', e.target.value)}
                        />
                      </label>
                      <label className="lab-profile-field">
                        <span className="lab-profile-field__label">Experience (years)</span>
                        <input
                          className="lab-profile-input"
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={2}
                          placeholder="e.g. 05"
                          value={form.experience_years}
                          onChange={(e) => {
                            const digits = e.target.value.replace(/\D/g, '').slice(0, 2);
                            if (digits !== '' && Number(digits) > 60) return;
                            setField('experience_years', digits);
                          }}
                        />
                      </label>
                      <div className="lab-profile-field lab-profile-field--span">
                        <span className="lab-profile-field__label">Languages</span>
                        <div className="lab-profile-lang-row">
                          {parseProfileLanguages(form.languages).map((lang) => (
                            <button
                              key={lang}
                              type="button"
                              className="lab-profile-lang-chip"
                              onClick={() => removeLanguage(lang)}
                            >
                              {lang} ×
                            </button>
                          ))}
                        </div>
                        <div className="lab-profile-lang-add">
                          <input
                            className="lab-profile-input"
                            placeholder="Add language"
                            value={langDraft}
                            onChange={(e) => setLangDraft(capitalizeFirst(e.target.value))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                addLanguageChip();
                              }
                            }}
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={addLanguageChip}
                          >
                            Add
                          </Button>
                        </div>
                      </div>
                      <label className="lab-profile-field lab-profile-field--span">
                        <span className="lab-profile-field__label">Bio</span>
                        <textarea
                          className="lab-profile-input"
                          rows={3}
                          value={form.bio}
                          onChange={(e) => setTextField('bio', e.target.value)}
                        />
                      </label>
                    </>
                  ) : (
                    <>
                      <ReadField label="Qualification" value={profile.qualification} />
                      <ReadField
                        label="Experience (years)"
                        value={
                          profile.experience_years != null
                            ? String(profile.experience_years)
                            : null
                        }
                      />
                      <ReadField
                        label="Languages"
                        value={
                          (profile.languages || []).length
                            ? profile.languages.join(', ')
                            : null
                        }
                      />
                      <ReadField label="Bio" value={profile.bio} />
                    </>
                  )}
                </div>
              </section>
            )}

            {activeTab === 'contact' && (
              <section
                id="lab-profile-section-contact"
                className="lab-profile-section is-active"
                role="tabpanel"
              >
                <h3 className="lab-profile-section__title">
                  <Phone size={16} aria-hidden /> Contact
                </h3>
                <div className="lab-profile-grid">
                  {editing && form ? (
                    <>
                      <label className="lab-profile-field">
                        <span className="lab-profile-field__label">Phone code</span>
                        <input
                          className="lab-profile-input"
                          maxLength={8}
                          value={form.phone_code}
                          onChange={(e) => setField('phone_code', e.target.value)}
                        />
                      </label>
                      <label className="lab-profile-field">
                        <span className="lab-profile-field__label">Phone</span>
                        <input
                          className="lab-profile-input"
                          type="tel"
                          inputMode="numeric"
                          autoComplete="tel"
                          maxLength={10}
                          placeholder="10-digit number"
                          value={form.phone}
                          onChange={(e) => setField('phone', formatPhoneInput(e.target.value))}
                        />
                      </label>
                      <label className="lab-profile-field">
                        <span className="lab-profile-field__label">Emergency contact name</span>
                        <input
                          className="lab-profile-input"
                          maxLength={120}
                          value={form.emergency_contact_name}
                          onChange={(e) => setTextField('emergency_contact_name', e.target.value)}
                        />
                      </label>
                      <label className="lab-profile-field">
                        <span className="lab-profile-field__label">Emergency phone</span>
                        <input
                          className="lab-profile-input"
                          type="tel"
                          inputMode="numeric"
                          autoComplete="tel"
                          maxLength={10}
                          placeholder="10-digit number"
                          value={form.emergency_contact_phone}
                          onChange={(e) =>
                            setField(
                              'emergency_contact_phone',
                              formatPhoneInput(e.target.value)
                            )
                          }
                        />
                      </label>
                      <label className="lab-profile-field">
                        <span className="lab-profile-field__label">Gender</span>
                        <select
                          className="lab-profile-input"
                          value={form.gender === '' || form.gender == null ? '' : form.gender}
                          onChange={(e) => {
                            if (e.target.value === '') {
                              setField('gender', '');
                              return;
                            }
                            const next = Number(e.target.value);
                            if (!isValidGender(next)) return;
                            setField('gender', next);
                          }}
                        >
                          <option value="">
                            Select gender
                          </option>
                          {GENDER_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="lab-profile-field">
                        <span className="lab-profile-field__label">Date of birth</span>
                        <input
                          className="lab-profile-input"
                          type="date"
                          value={form.date_of_birth || ''}
                          onChange={(e) => setField('date_of_birth', e.target.value)}
                        />
                      </label>
                      <label className="lab-profile-field">
                        <span className="lab-profile-field__label">City</span>
                        <input
                          className="lab-profile-input"
                          maxLength={100}
                          value={form.city}
                          onChange={(e) => setTextField('city', e.target.value)}
                        />
                      </label>
                      <label className="lab-profile-field">
                        <span className="lab-profile-field__label">Country</span>
                        <input
                          className="lab-profile-input"
                          maxLength={100}
                          value={form.country}
                          onChange={(e) => setTextField('country', e.target.value)}
                        />
                      </label>
                      <label className="lab-profile-field">
                        <span className="lab-profile-field__label">Postal code</span>
                        <input
                          className="lab-profile-input"
                          maxLength={20}
                          value={form.postal_code}
                          onChange={(e) => setTextField('postal_code', e.target.value)}
                        />
                      </label>
                      <label className="lab-profile-field">
                        <span className="lab-profile-field__label">State</span>
                        <input
                          className="lab-profile-input"
                          maxLength={100}
                          value={form.state}
                          onChange={(e) => setTextField('state', e.target.value)}
                        />
                      </label>
                      <label className="lab-profile-field lab-profile-field--span">
                        <span className="lab-profile-field__label">Address line</span>
                        <textarea
                          className="lab-profile-input"
                          rows={2}
                          value={form.address_line}
                          onChange={(e) => setTextField('address_line', e.target.value)}
                        />
                      </label>
                    </>
                  ) : (
                    <>
                      <ReadField label="Phone code" value={profile.phone_code} />
                      <ReadField label="Phone" value={profile.phone} />
                      <ReadField
                        label="Emergency contact name"
                        value={profile.emergency_contact?.name}
                      />
                      <ReadField
                        label="Emergency phone"
                        value={profile.emergency_contact?.phone}
                      />
                      <ReadField label="Gender" value={genderLabel(profile.gender)} />
                      <ReadField label="Date of birth" value={profile.date_of_birth} />
                      <ReadField label="City" value={profile.address?.city} />
                      <ReadField label="State" value={profile.address?.state} />
                      <ReadField label="Country" value={profile.address?.country} />
                      <ReadField label="Postal code" value={profile.address?.postal_code} />
                      <ReadField label="Address line" value={profile.address?.line} />
                    </>
                  )}
                </div>
              </section>
            )}
          </form>
        </div>
      </div>

      <ProfilePhotoCropDialog
        isOpen={Boolean(cropFile)}
        file={cropFile}
        confirming={cropUploading || uploadImage.isPending}
        onCancel={() => {
          if (!cropUploading && !uploadImage.isPending) setCropFile(null);
        }}
        onConfirm={handleCropConfirm}
      />

      {/* Nurse Phase 2 by Atharva — confirm before removing profile photo */}
      <ConfirmDialog
        isOpen={removePhotoConfirmOpen}
        title="Remove profile photo?"
        message="This will remove your current profile photo. You can upload a new one anytime."
        confirmLabel={deleteImage.isPending ? 'Removing…' : 'Remove'}
        onCancel={() => {
          if (!deleteImage.isPending) setRemovePhotoConfirmOpen(false);
        }}
        onConfirm={handleDeleteImage}
      />
    </LabLayout>
  );
}
