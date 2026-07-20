/**
 * Doctor Phase 2 by Atharva —
 * Doctor self-service profile page against GET/PUT /doctor/profile + image APIs.
 * Editable vs admin read-only fields follow the frontend guide contract.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Briefcase,
  CalendarDays,
  Edit3,
  FlaskConical,
  LayoutDashboard,
  Phone,
  Shield,
  Trash2,
  Upload,
  User,
  Users,
  X,
} from 'lucide-react';
import DoctorShell from '@/features/doctor/components/DoctorShell';
import {
  DOCTOR_PROFILE_EDITABLE_TOP_KEYS,
  resolveDoctorProfileImageUrl,
} from '@/features/doctor/api/profile';
import {
  useDeleteDoctorProfileImageMutation,
  useDoctorProfileQuery,
  useUpdateDoctorProfileMutation,
  useUploadDoctorProfileImageMutation,
} from '@/features/doctor/hooks/useDoctorProfileQuery';
import { ROUTES } from '@/shared/constants';
import { Button, ConfirmDialog, EmptyState } from '@/shared/components/common';
import PageSpinner from '@/shared/components/PageSpinner';
import { toast } from '@/shared/utils/toast';
import { formatPhoneInput } from '@/shared/utils/validators';
import '../styles/doctor-ui.css';
import './DoctorProfilePage.css';

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

/** Doctor Phase 2 by Atharva — phone / emergency phone must be exactly 10 digits */
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
  return shift.name || null;
}

/** Doctor Phase 2 by Atharva — relative “updated ago” for hero status */
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
    qualification: profile?.qualification ?? '',
    experience_years:
      profile?.experience_years === null || profile?.experience_years === undefined
        ? ''
        : String(profile.experience_years),
    bio: profile?.bio ?? '',
    languages: Array.isArray(profile?.languages) ? profile.languages.join(', ') : '',
    phone: formatPhoneInput(profile?.phone ?? ''),
    phone_code: profile?.phone_code ?? '+91',
    address_line: profile?.address?.line ?? '',
    city: profile?.address?.city ?? '',
    state: profile?.address?.state ?? '',
    date_of_birth: profile?.date_of_birth ?? '',
    gender: profile?.gender ?? '',
    emergency_contact_name: profile?.emergency_contact?.name ?? '',
    emergency_contact_phone: formatPhoneInput(profile?.emergency_contact?.phone ?? ''),
  };
}

function parseLanguages(raw) {
  return [
    ...new Set(
      String(raw || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    ),
  ];
}

/**
 * Doctor Phase 2 by Atharva —
 * Build dirty PUT payload; nest address / emergency_contact per v2.0 guide.
 */
function buildDirtyPayload(form, baseline) {
  const payload = {};

  DOCTOR_PROFILE_EDITABLE_TOP_KEYS.forEach((key) => {
    if (key === 'languages') {
      const next = parseLanguages(form.languages);
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
    if (
      key === 'phone' ||
      key === 'phone_code' ||
      key === 'qualification' ||
      key === 'bio' ||
      key === 'date_of_birth'
    ) {
      const next = form[key] === '' ? null : form[key];
      const prev = baseline[key] ?? null;
      if ((next ?? null) !== (prev ?? null)) payload[key] = next;
    }
  });

  const nextAddress = {
    line: form.address_line === '' ? null : form.address_line,
    city: form.city === '' ? null : form.city,
    state: form.state === '' ? null : form.state,
  };
  const prevAddress = baseline.address || {};
  const addressChanged =
    (nextAddress.line ?? null) !== (prevAddress.line ?? null) ||
    (nextAddress.city ?? null) !== (prevAddress.city ?? null) ||
    (nextAddress.state ?? null) !== (prevAddress.state ?? null);
  if (addressChanged) payload.address = nextAddress;

  const nextEmergency = {
    name: form.emergency_contact_name === '' ? null : form.emergency_contact_name,
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
  return (
    <div className="doc-profile-field">
      <span className="doc-profile-field__label">{label}</span>
      <p className={`doc-profile-field__value${!value ? ' doc-profile-field__value--empty' : ''}`}>
        {value || 'Not set'}
      </p>
    </div>
  );
}

export default function DoctorProfilePage() {
  const navigate = useNavigate();
  const { data, isLoading, isError, error, refetch } = useDoctorProfileQuery();
  const profile = data?.profile;
  const updateProfile = useUpdateDoctorProfileMutation();
  const uploadImage = useUploadDoctorProfileImageMutation();
  const deleteImage = useDeleteDoctorProfileImageMutation();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [langDraft, setLangDraft] = useState('');
  // Doctor Phase 2 by Atharva — tabs: show one section at a time; Account default
  const [activeTab, setActiveTab] = useState('account');
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const [removePhotoConfirmOpen, setRemovePhotoConfirmOpen] = useState(false);
  const avatarWrapRef = useRef(null);
  const fileInputRef = useRef(null);

  const startEdit = () => {
    // Doctor Phase 2 by Atharva — Account is read-only; edit opens Professional
    setEditing(true);
    if (activeTab === 'account') setActiveTab('professional');
  };

  useEffect(() => {
    if (profile && !editing) {
      setForm(buildEditableForm(profile));
    }
  }, [profile, editing]);

  // Doctor Phase 2 by Atharva — close avatar menu on outside click / Escape
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
    if (!profile) return 'Doctor';
    return `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email;
  }, [profile]);

  const imageUrl = resolveDoctorProfileImageUrl(profile?.profile_image_url);

  const completionPct = Math.min(
    100,
    Math.max(0, Number(profile?.profile_completion_percentage) || 0)
  );

  const nav = useMemo(
    () => [
      { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={22} /> },
      { id: 'patients', label: 'Patients', icon: <Users size={22} /> },
      { id: 'labs', label: 'Lab Tests', icon: <FlaskConical size={22} /> },
      { id: 'schedule', label: 'Calendar', icon: <CalendarDays size={22} /> },
    ],
    []
  );

  const handleNav = (id) => {
    navigate(ROUTES.DOCTOR_DASHBOARD, { state: { doctorSection: id } });
  };

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleCancel = () => {
    setForm(buildEditableForm(profile));
    setEditing(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();

    // Doctor Phase 2 by Atharva — phone & emergency_contact_phone must be exactly 10 digits
    const phone = formatPhoneInput(form?.phone);
    const emergencyPhone = formatPhoneInput(form?.emergency_contact_phone);
    if (!isStrictTenDigitPhone(phone)) {
      toast.error('Phone must be a 10-digit number');
      setActiveTab('contact');
      return;
    }
    if (!isStrictTenDigitPhone(emergencyPhone)) {
      toast.error('Emergency phone must be a 10-digit number');
      setActiveTab('contact');
      return;
    }
    // Doctor Phase 2 by Atharva — gender must be one of the four options (not blank Select)
    if (!isValidGender(form?.gender)) {
      toast.error('Please select a gender');
      setActiveTab('contact');
      return;
    }

    const formForSave = {
      ...form,
      phone,
      emergency_contact_phone: emergencyPhone,
      gender: Number(form.gender),
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

  const handleImageChange = async (e) => {
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
    try {
      await uploadImage.mutateAsync(file);
      toast.success('Profile image uploaded');
    } catch {
      /* toasted */
    }
  };

  const handleDeleteImage = async () => {
    try {
      await deleteImage.mutateAsync();
      toast.success('Profile image removed');
      setRemovePhotoConfirmOpen(false);
    } catch {
      /* toasted */
    }
  };

  const handleAvatarUploadClick = () => {
    setAvatarMenuOpen(false);
    fileInputRef.current?.click();
  };

  // Doctor Phase 2 by Atharva — ask confirm before deleting profile photo
  const handleAvatarRemoveClick = () => {
    setAvatarMenuOpen(false);
    setRemovePhotoConfirmOpen(true);
  };

  const addLanguageChip = () => {
    const next = langDraft.trim();
    if (!next) return;
    const list = parseLanguages(form.languages);
    if (!list.some((l) => l.toLowerCase() === next.toLowerCase())) {
      setField('languages', [...list, next].join(', '));
    }
    setLangDraft('');
  };

  const removeLanguage = (lang) => {
    setField(
      'languages',
      parseLanguages(form.languages)
        .filter((l) => l.toLowerCase() !== lang.toLowerCase())
        .join(', ')
    );
  };

  if (isLoading) {
    return (
      <DoctorShell title="Doctor" nav={nav} active="profile" onSelect={handleNav}>
        <PageSpinner />
      </DoctorShell>
    );
  }

  if (isError) {
    return (
      <DoctorShell title="Doctor" nav={nav} active="profile" onSelect={handleNav}>
        <EmptyState
          icon={User}
          title="Could not load profile"
          description={
            error?.message
            || (error?.status === 403
              ? "You don't have permission to view this profile."
              : error?.status === 404
                ? 'Doctor profile not found. Contact admin to create your doctor profile.'
                : 'Something went wrong. Please try again.')
          }
        />
        <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Button variant="primary" onClick={() => refetch()}>
            Try again
          </Button>
          <Button variant="outline" onClick={() => navigate(ROUTES.DOCTOR_DASHBOARD)}>
            <ArrowLeft size={16} /> Back to dashboard
          </Button>
        </div>
      </DoctorShell>
    );
  }

  if (!profile) {
    return (
      <DoctorShell title="Doctor" nav={nav} active="profile" onSelect={handleNav}>
        <EmptyState
          icon={User}
          title="Doctor profile not found"
          description="Contact admin to create your doctor profile."
        />
        <div style={{ marginTop: '1rem' }}>
          <Button variant="outline" onClick={() => navigate(ROUTES.DOCTOR_DASHBOARD)}>
            <ArrowLeft size={16} /> Back to dashboard
          </Button>
        </div>
      </DoctorShell>
    );
  }

  const saving = updateProfile.isPending;
  const hasProfileImage = Boolean(profile.profile_image_url || imageUrl);
  const departmentName =
    typeof profile.department === 'object' ? profile.department?.name : profile.department;
  const roleName = typeof profile.role === 'object' ? profile.role?.name : profile.role;

  return (
    <DoctorShell title="Doctor" nav={nav} active="profile" onSelect={handleNav}>
      <div className="doc-profile-page">
        <div className="doc-card doc-profile-card">
          <div className="doc-profile-hero">
            <div className="doc-profile-avatar-wrap" ref={avatarWrapRef}>
              <button
                type="button"
                className="doc-profile-avatar-trigger"
                onClick={() => setAvatarMenuOpen((open) => !open)}
                aria-expanded={avatarMenuOpen}
                aria-haspopup="menu"
                aria-label="Profile photo options"
              >
                {imageUrl ? (
                  <img src={imageUrl} alt="" className="doc-profile-avatar-img" />
                ) : (
                  <div className="doc-profile-avatar-fallback" aria-hidden>
                    {(profile.first_name || 'D').charAt(0).toUpperCase()}
                  </div>
                )}
              </button>

              {avatarMenuOpen ? (
                <div className="doc-profile-avatar-menu" role="menu">
                  <button
                    type="button"
                    role="menuitem"
                    className="doc-profile-avatar-menu__item"
                    onClick={handleAvatarUploadClick}
                    disabled={uploadImage.isPending}
                  >
                    <Upload size={14} aria-hidden />
                    {uploadImage.isPending ? 'Uploading…' : 'Upload'}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="doc-profile-avatar-menu__item doc-profile-avatar-menu__item--danger"
                    onClick={handleAvatarRemoveClick}
                    disabled={deleteImage.isPending || !hasProfileImage}
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
            <div className="doc-profile-hero__meta">
              <div className="doc-profile-hero__top">
                <div>
                  <h2 className="doc-profile-hero__name">{displayName}</h2>
                  <p className="doc-profile-hero__sub">{profile.email}</p>
                </div>
              </div>
              <div className="doc-profile-hero__tags">
                {departmentName ? <span className="doc-profile-tag">{departmentName}</span> : null}
                {profile.specialization ? (
                  <span className="doc-profile-tag">{profile.specialization}</span>
                ) : null}
                {profile.consultation_fee != null ? (
                  <span className="doc-profile-tag">₹{profile.consultation_fee}</span>
                ) : null}
                {fmtShift(profile.shift) ? (
                  <span className="doc-profile-tag">{fmtShift(profile.shift)}</span>
                ) : null}
                <span
                  className={`doc-profile-tag ${
                    profile.is_profile_completed ? 'doc-profile-tag--ok' : 'doc-profile-tag--warn'
                  }`}
                >
                  {profile.is_profile_completed ? 'Profile complete' : 'Incomplete'}
                </span>
                {profile.is_active ? (
                  <span className="doc-profile-tag doc-profile-tag--ok">Active</span>
                ) : (
                  <span className="doc-profile-tag doc-profile-tag--warn">Inactive</span>
                )}
              </div>
              <div className="doc-profile-hero__status-row">
                <div
                  className="doc-profile-progress"
                  role="progressbar"
                  aria-valuenow={completionPct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Profile completion"
                >
                  <div className="doc-profile-progress__track">
                    <div
                      className="doc-profile-progress__fill"
                      style={{ width: `${completionPct}%` }}
                    />
                  </div>
                  <span className="doc-profile-progress__label">{completionPct}% complete</span>
                </div>
                {formatUpdatedAgo(profile.updated_at) ? (
                  <p className="doc-profile-hero__updated">
                    Profile updated {formatUpdatedAgo(profile.updated_at)}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          {/* Doctor Phase 2 by Atharva — tabs: one section visible; Account default */}
          <div className="doc-profile-page__toolbar">
            <div className="doc-profile-tabs" role="tablist" aria-label="Profile sections">
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
                    className={`doc-profile-tab${activeTab === tab.id ? ' is-active' : ''}`}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    <Icon size={15} aria-hidden />
                    {tab.label}
                  </button>
                );
              })}
            </div>
            <div className="doc-profile-page__actions">
              {editing ? (
                <>
                  <Button variant="outline" size="sm" onClick={handleCancel} disabled={saving}>
                    <X size={16} /> Cancel
                  </Button>
                  <Button
                    size="sm"
                    type="button"
                    disabled={saving || activeTab === 'account'}
                    onClick={() => document.getElementById('doctor-profile-form')?.requestSubmit()}
                  >
                    {saving ? 'Saving…' : 'Save changes'}
                  </Button>
                </>
              ) : (
                <Button size="sm" onClick={startEdit}>
                  <Edit3 size={16} /> Edit profile
                </Button>
              )}
            </div>
          </div>

          <form id="doctor-profile-form" className="doc-profile-body" onSubmit={handleSave}>
            {activeTab === 'account' && (
            <section
              id="doc-profile-section-account"
              className="doc-profile-section is-active"
              role="tabpanel"
            >
              <h3 className="doc-profile-section__title">
                <Shield size={16} aria-hidden /> Account
              </h3>
              <p className="doc-profile-hint">
                License, fee, specialization, department, employee ID, joining date, and shift are
                managed by admin.
              </p>
              <div className="doc-profile-grid">
                <ReadField label="First name" value={profile.first_name} />
                <ReadField label="Last name" value={profile.last_name} />
                <ReadField label="Email" value={profile.email} />
                <ReadField label="Role" value={roleName} />
                <ReadField label="Employee ID" value={profile.employee_id} />
                <ReadField label="Joining date" value={profile.joining_date} />
                <ReadField label="Department" value={departmentName} />
                <ReadField label="Specialization" value={profile.specialization} />
                <ReadField label="Medical license" value={profile.medical_license_number} />
                <ReadField
                  label="Consultation fee"
                  value={
                    profile.consultation_fee != null ? `₹${profile.consultation_fee}` : null
                  }
                />
                <ReadField label="Shift" value={fmtShift(profile.shift)} />
                <ReadField label="Shift start" value={profile.shift?.start_time} />
                <ReadField label="Shift end" value={profile.shift?.end_time} />
              </div>
            </section>
            )}

            {activeTab === 'professional' && (
            <section
              id="doc-profile-section-professional"
              className="doc-profile-section is-active"
              role="tabpanel"
            >
              <h3 className="doc-profile-section__title">
                <Briefcase size={16} aria-hidden /> Professional
              </h3>
              <div className="doc-profile-grid">
                {editing && form ? (
                  <>
                    <label className="doc-profile-field">
                      <span className="doc-profile-field__label">Qualification</span>
                      <input
                        className="doc-input"
                        value={form.qualification}
                        maxLength={255}
                        onChange={(e) => setField('qualification', e.target.value)}
                      />
                    </label>
                    <label className="doc-profile-field">
                      <span className="doc-profile-field__label">Experience (years)</span>
                      <input
                        className="doc-input"
                        type="number"
                        min={0}
                        max={60}
                        value={form.experience_years}
                        onChange={(e) => setField('experience_years', e.target.value)}
                      />
                    </label>
                    <div className="doc-profile-field doc-profile-field--span">
                      <span className="doc-profile-field__label">Languages</span>
                      <div className="doc-profile-lang-row">
                        {parseLanguages(form.languages).map((lang) => (
                          <button
                            key={lang}
                            type="button"
                            className="doc-profile-lang-chip"
                            onClick={() => removeLanguage(lang)}
                          >
                            {lang} ×
                          </button>
                        ))}
                      </div>
                      <div className="doc-profile-lang-add">
                        <input
                          className="doc-input"
                          placeholder="Add language"
                          value={langDraft}
                          onChange={(e) => setLangDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addLanguageChip();
                            }
                          }}
                        />
                        <Button type="button" size="sm" variant="outline" onClick={addLanguageChip}>
                          Add
                        </Button>
                      </div>
                    </div>
                    <label className="doc-profile-field doc-profile-field--span">
                      <span className="doc-profile-field__label">Bio</span>
                      <textarea
                        className="doc-input"
                        rows={3}
                        value={form.bio}
                        onChange={(e) => setField('bio', e.target.value)}
                      />
                    </label>
                  </>
                ) : (
                  <>
                    <ReadField label="Qualification" value={profile.qualification} />
                    <ReadField
                      label="Experience (years)"
                      value={
                        profile.experience_years != null ? String(profile.experience_years) : null
                      }
                    />
                    <ReadField
                      label="Languages"
                      value={(profile.languages || []).length ? profile.languages.join(', ') : null}
                    />
                    <ReadField label="Bio" value={profile.bio} />
                  </>
                )}
              </div>
            </section>
            )}

            {activeTab === 'contact' && (
            <section
              id="doc-profile-section-contact"
              className="doc-profile-section is-active"
              role="tabpanel"
            >
              <h3 className="doc-profile-section__title">
                <Phone size={16} aria-hidden /> Contact
              </h3>
              <div className="doc-profile-grid">
                {editing && form ? (
                  <>
                    <label className="doc-profile-field">
                      <span className="doc-profile-field__label">Phone code</span>
                      <input
                        className="doc-input"
                        maxLength={10}
                        value={form.phone_code}
                        onChange={(e) => setField('phone_code', e.target.value)}
                      />
                    </label>
                    <label className="doc-profile-field">
                      <span className="doc-profile-field__label">Phone</span>
                      <input
                        className="doc-input"
                        type="tel"
                        inputMode="numeric"
                        autoComplete="tel"
                        maxLength={10}
                        placeholder="10-digit number"
                        value={form.phone}
                        onChange={(e) => setField('phone', formatPhoneInput(e.target.value))}
                      />
                    </label>
                    <label className="doc-profile-field">
                      <span className="doc-profile-field__label">Emergency contact name</span>
                      <input
                        className="doc-input"
                        maxLength={120}
                        value={form.emergency_contact_name}
                        onChange={(e) => setField('emergency_contact_name', e.target.value)}
                      />
                    </label>
                    <label className="doc-profile-field">
                      <span className="doc-profile-field__label">Emergency phone</span>
                      <input
                        className="doc-input"
                        type="tel"
                        inputMode="numeric"
                        autoComplete="tel"
                        maxLength={10}
                        placeholder="10-digit number"
                        value={form.emergency_contact_phone}
                        onChange={(e) =>
                          setField('emergency_contact_phone', formatPhoneInput(e.target.value))
                        }
                      />
                    </label>
                    <label className="doc-profile-field">
                      <span className="doc-profile-field__label">Gender</span>
                      <select
                        className="doc-input"
                        required
                        value={form.gender === '' || form.gender == null ? '' : form.gender}
                        onChange={(e) => {
                          const next = Number(e.target.value);
                          if (!isValidGender(next)) return;
                          setField('gender', next);
                        }}
                      >
                        <option value="" disabled>
                          Select gender
                        </option>
                        {GENDER_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="doc-profile-field">
                      <span className="doc-profile-field__label">Date of birth</span>
                      <input
                        className="doc-input"
                        type="date"
                        value={form.date_of_birth || ''}
                        onChange={(e) => setField('date_of_birth', e.target.value)}
                      />
                    </label>
                    <label className="doc-profile-field">
                      <span className="doc-profile-field__label">City</span>
                      <input
                        className="doc-input"
                        maxLength={100}
                        value={form.city}
                        onChange={(e) => setField('city', e.target.value)}
                      />
                    </label>
                    <label className="doc-profile-field">
                      <span className="doc-profile-field__label">State</span>
                      <input
                        className="doc-input"
                        maxLength={100}
                        value={form.state}
                        onChange={(e) => setField('state', e.target.value)}
                      />
                    </label>
                    <label className="doc-profile-field doc-profile-field--span">
                      <span className="doc-profile-field__label">Address</span>
                      <textarea
                        className="doc-input"
                        rows={2}
                        value={form.address_line}
                        onChange={(e) => setField('address_line', e.target.value)}
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
                    <ReadField label="Address" value={profile.address?.line} />
                  </>
                )}
              </div>
            </section>
            )}
          </form>
        </div>
      </div>

      {/* Doctor Phase 2 by Atharva — confirm before removing profile photo */}
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
    </DoctorShell>
  );
}
