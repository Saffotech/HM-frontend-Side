/**
 * Super Admin Profile — live GET/PUT /super-admin/profile + image APIs.
 * Lightweight identity: Account / Professional / Contact.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
  SUPER_ADMIN_PROFILE_EDITABLE_TOP_KEYS,
  resolveSuperAdminProfileImageUrl,
} from '@/features/super-admin/api/profile';
import {
  useDeleteSuperAdminProfileImageMutation,
  useSuperAdminProfileQuery,
  useUpdateSuperAdminProfileMutation,
  useUploadSuperAdminProfileImageMutation,
} from '@/features/super-admin/hooks/useSuperAdminProfileQuery';
import SuperAdminLayout from '@/features/super-admin/components/SuperAdminLayout';
import SuperAdminPageHeader from '@/features/super-admin/components/SuperAdminPageHeader';
import { ROUTES } from '@/shared/constants';
import {
  Button,
  ConfirmDialog,
  DateInput,
  EmptyState,
  ProfilePhoneField,
  ProfilePhotoCropDialog,
} from '@/shared/components/common';
import PageSpinner from '@/shared/components/PageSpinner';
import { toast } from '@/shared/utils/toast';
import { formatPhoneDisplay } from '@/shared/utils/phoneCountryCode';
import { formatPhoneInput } from '@/shared/utils/validators';
import {
  capitalizeFirst,
  displayProfileText,
  parseProfileLanguages,
} from '@/shared/utils/profileTextFormat';
import './SuperAdminProfilePage.css';

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

function isStrictTenDigitPhone(value) {
  return TEN_DIGIT_PHONE.test(String(value ?? '').trim());
}

function isValidGender(value) {
  return VALID_GENDER_VALUES.includes(Number(value));
}

function genderLabel(code) {
  return GENDER_OPTIONS.find((o) => o.value === code)?.label ?? null;
}

function formatUpdatedAgo(iso) {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  const seconds = Math.floor((Date.now() - then) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function buildEditableForm(profile) {
  return {
    bio: capitalizeFirst(profile?.bio ?? ''),
    languages: Array.isArray(profile?.languages)
      ? profile.languages.map((l) => capitalizeFirst(l)).join(', ')
      : '',
    phone: formatPhoneInput(profile?.phone ?? ''),
    phone_code: profile?.phone_code ?? '+91',
    address_line: capitalizeFirst(profile?.address?.line ?? ''),
    city: capitalizeFirst(profile?.address?.city ?? ''),
    state: capitalizeFirst(profile?.address?.state ?? ''),
    date_of_birth: profile?.date_of_birth ?? '',
    gender: profile?.gender ?? '',
    emergency_contact_name: capitalizeFirst(profile?.emergency_contact?.name ?? ''),
    emergency_contact_phone: formatPhoneInput(profile?.emergency_contact?.phone ?? ''),
  };
}

function buildDirtyPayload(form, baseline) {
  const payload = {};

  SUPER_ADMIN_PROFILE_EDITABLE_TOP_KEYS.forEach((key) => {
    if (key === 'languages') {
      const next = parseProfileLanguages(form.languages);
      const prev = Array.isArray(baseline.languages) ? baseline.languages : [];
      if (JSON.stringify(next) !== JSON.stringify(prev)) payload.languages = next;
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
    if (key === 'bio') {
      const next = form[key] === '' ? null : capitalizeFirst(form[key]);
      const prev = baseline[key] ?? null;
      if ((next ?? null) !== (prev ?? null)) payload[key] = next;
    }
  });

  const nextAddress = {
    line: form.address_line === '' ? null : capitalizeFirst(form.address_line),
    city: form.city === '' ? null : capitalizeFirst(form.city),
    state: form.state === '' ? null : capitalizeFirst(form.state),
  };
  const prevAddress = baseline.address || {};
  const addressChanged =
    (nextAddress.line ?? null) !== (prevAddress.line ?? null) ||
    (nextAddress.city ?? null) !== (prevAddress.city ?? null) ||
    (nextAddress.state ?? null) !== (prevAddress.state ?? null);
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
    <div className="sa-profile-field">
      <span className="sa-profile-field__label">{label}</span>
      <p
        className={`sa-profile-field__value${!display ? ' sa-profile-field__value--empty' : ''}`}
      >
        {display || 'Not set'}
      </p>
    </div>
  );
}

export default function SuperAdminProfilePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data, isLoading, isError, error, refetch } = useSuperAdminProfileQuery();
  const profile = data?.profile;
  const updateProfile = useUpdateSuperAdminProfileMutation();
  const uploadImage = useUploadSuperAdminProfileImageMutation();
  const deleteImage = useDeleteSuperAdminProfileImageMutation();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [langDraft, setLangDraft] = useState('');
  const [activeTab, setActiveTab] = useState(() => {
    const tab = location.state?.superAdminProfileTab;
    return PROFILE_TABS.has(tab) ? tab : 'account';
  });
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const [removePhotoConfirmOpen, setRemovePhotoConfirmOpen] = useState(false);
  const [cropFile, setCropFile] = useState(null);
  const [cropUploading, setCropUploading] = useState(false);
  const avatarWrapRef = useRef(null);
  const fileInputRef = useRef(null);

  const startEdit = () => {
    setEditing(true);
  };

  useEffect(() => {
    if (profile && !editing) {
      setForm(buildEditableForm(profile));
    }
  }, [profile, editing]);

  useEffect(() => {
    const tab = location.state?.superAdminProfileTab;
    if (PROFILE_TABS.has(tab)) setActiveTab(tab);
  }, [location.state]);

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
    if (!profile) return 'Super Admin';
    const name = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email;
    return displayProfileText(name);
  }, [profile]);

  const imageUrl = resolveSuperAdminProfileImageUrl(profile?.profile_image_url);

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

    const phone = formatPhoneInput(form?.phone);
    const emergencyPhone = formatPhoneInput(form?.emergency_contact_phone);

    if (phone && !isStrictTenDigitPhone(phone)) {
      toast.error('Phone must be exactly 10 digits');
      setActiveTab('contact');
      return;
    }
    if (emergencyPhone && !isStrictTenDigitPhone(emergencyPhone)) {
      toast.error('Emergency phone must be exactly 10 digits');
      setActiveTab('contact');
      return;
    }
    if (form?.gender !== '' && form?.gender != null && !isValidGender(form.gender)) {
      toast.error('Please select a valid gender');
      setActiveTab('contact');
      return;
    }

    const payload = buildDirtyPayload(
      {
        ...form,
        phone: phone || '',
        emergency_contact_phone: emergencyPhone || '',
      },
      profile
    );

    if (Object.keys(payload).length === 0) {
      toast.info('No changes to save');
      setEditing(false);
      return;
    }

    try {
      await updateProfile.mutateAsync(payload);
      toast.success('Profile updated');
      setEditing(false);
    } catch (err) {
      toast.error(err?.message || 'Failed to update profile');
    }
  };

  const addLanguageChip = () => {
    const next = capitalizeFirst(langDraft.trim());
    if (!next) return;
    const current = parseProfileLanguages(form?.languages);
    if (current.some((l) => l.toLowerCase() === next.toLowerCase())) {
      setLangDraft('');
      return;
    }
    setField('languages', [...current, next].join(', '));
    setLangDraft('');
  };

  const removeLanguage = (lang) => {
    const next = parseProfileLanguages(form?.languages).filter(
      (l) => l.toLowerCase() !== String(lang).toLowerCase()
    );
    setField('languages', next.join(', '));
  };

  const handleAvatarUploadClick = () => {
    setAvatarMenuOpen(false);
    fileInputRef.current?.click();
  };

  const handleAvatarRemoveClick = () => {
    setAvatarMenuOpen(false);
    setRemovePhotoConfirmOpen(true);
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast.error('Only JPG, PNG, or WEBP images are allowed');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error('Image must be 5 MB or smaller');
      return;
    }
    setCropFile(file);
  };

  const handleCropConfirm = async (croppedFile) => {
    setCropUploading(true);
    try {
      await uploadImage.mutateAsync(croppedFile);
      setCropFile(null);
      toast.success('Profile photo updated');
    } catch (err) {
      toast.error(err?.message || 'Failed to upload photo');
    } finally {
      setCropUploading(false);
    }
  };

  const handleDeleteImage = async () => {
    try {
      await deleteImage.mutateAsync();
      setRemovePhotoConfirmOpen(false);
      toast.success('Profile photo removed');
    } catch (err) {
      toast.error(err?.message || 'Failed to remove photo');
    }
  };

  if (isLoading) {
    return (
      <SuperAdminLayout pageTitle="My Profile" compact>
        <div className="sa-profile-page">
          <SuperAdminPageHeader
            title="My Profile"
          />
          <PageSpinner label="Loading profile…" />
        </div>
      </SuperAdminLayout>
    );
  }

  if (isError || !profile) {
    return (
      <SuperAdminLayout pageTitle="My Profile" compact>
        <div className="sa-profile-page">
          <SuperAdminPageHeader
            title="My Profile"
          />
          <EmptyState
            icon={User}
            title="Could not load profile"
            description={
              error?.message
              || (error?.status === 403
                ? "You don't have permission to view this profile."
                : error?.status === 404
                  ? 'Super Admin profile not found. Run seed or contact support.'
                  : 'Please try again.')
            }
          />
          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
            <Button variant="outline" onClick={() => refetch()}>
              Retry
            </Button>
            <Button variant="ghost" onClick={() => navigate(ROUTES.SUPER_ADMIN_DASHBOARD)}>
              <ArrowLeft size={16} /> Dashboard
            </Button>
          </div>
        </div>
      </SuperAdminLayout>
    );
  }

  const roleName = profile.role?.name
    ? displayProfileText(String(profile.role.name).replace(/_/g, ' '))
    : 'Super Admin';
  const hasProfileImage = Boolean(profile.profile_image_url);
  const saving = updateProfile.isPending;
  const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();

  return (
    <SuperAdminLayout pageTitle="My Profile" compact>
      <div className="sa-profile-page">
        <SuperAdminPageHeader
          title="My Profile"
          actions={
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(ROUTES.SUPER_ADMIN_DASHBOARD)}
            >
              <ArrowLeft size={16} /> Dashboard
            </Button>
          }
        />

        <div className="sa-profile-card">
          <div className="sa-profile-hero">
            <div className="sa-profile-avatar-wrap" ref={avatarWrapRef}>
              <button
                type="button"
                className="sa-profile-avatar"
                aria-label="Profile photo options"
                aria-haspopup="menu"
                aria-expanded={avatarMenuOpen}
                onClick={() => setAvatarMenuOpen((open) => !open)}
              >
                {imageUrl ? (
                  <img src={imageUrl} alt="" className="sa-profile-avatar__img" />
                ) : (
                  <div className="sa-profile-avatar__placeholder" aria-hidden>
                    <User size={34} strokeWidth={1.75} />
                  </div>
                )}
              </button>

              {avatarMenuOpen ? (
                <div className="sa-profile-avatar-menu" role="menu">
                  <button
                    type="button"
                    role="menuitem"
                    className="sa-profile-avatar-menu__item"
                    onClick={handleAvatarUploadClick}
                    disabled={uploadImage.isPending}
                  >
                    <Upload size={14} aria-hidden />
                    {uploadImage.isPending ? 'Uploading…' : 'Upload'}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="sa-profile-avatar-menu__item sa-profile-avatar-menu__item--danger"
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
            <div className="sa-profile-hero__meta">
              <div className="sa-profile-hero__top">
                <div>
                  <h2 className="sa-profile-hero__name">{displayName}</h2>
                  <p className="sa-profile-hero__sub">{profile.email}</p>
                </div>
              </div>
              <div className="sa-profile-hero__tags">
                {roleName ? <span className="sa-profile-tag">{roleName}</span> : null}
                <span
                  className={`sa-profile-tag ${
                    profile.is_profile_completed
                      ? 'sa-profile-tag--ok'
                      : 'sa-profile-tag--warn'
                  }`}
                >
                  {profile.is_profile_completed ? 'Profile complete' : 'Incomplete'}
                </span>
                {profile.is_active ? (
                  <span className="sa-profile-tag sa-profile-tag--ok">Active</span>
                ) : (
                  <span className="sa-profile-tag sa-profile-tag--warn">Inactive</span>
                )}
              </div>
              <div className="sa-profile-hero__status-row">
                <div
                  className="sa-profile-progress"
                  role="progressbar"
                  aria-valuenow={completionPct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Profile completion"
                >
                  <div className="sa-profile-progress__track">
                    <div
                      className="sa-profile-progress__fill"
                      style={{ width: `${completionPct}%` }}
                    />
                  </div>
                  <span className="sa-profile-progress__label">{completionPct}% complete</span>
                </div>
                {formatUpdatedAgo(profile.updated_at) ? (
                  <p className="sa-profile-hero__updated">
                    Profile updated {formatUpdatedAgo(profile.updated_at)}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="sa-profile-page__toolbar">
            <div className="sa-profile-tabs" role="tablist" aria-label="Profile sections">
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
                    className={`sa-profile-tab${activeTab === tab.id ? ' is-active' : ''}`}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    <Icon size={15} aria-hidden />
                    {tab.label}
                  </button>
                );
              })}
            </div>
            <div className="sa-profile-page__actions">
              {editing ? (
                <>
                  <Button variant="outline" size="sm" onClick={handleCancel} disabled={saving}>
                    <X size={16} /> Cancel
                  </Button>
                  <Button
                    size="sm"
                    type="button"
                    disabled={saving}
                    onClick={() => document.getElementById('sa-profile-form')?.requestSubmit()}
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

          <form id="sa-profile-form" className="sa-profile-body" onSubmit={handleSave}>
            {activeTab === 'account' && (
              <section
                id="sa-profile-section-account"
                className="sa-profile-section is-active"
                role="tabpanel"
              >
                <h3 className="sa-profile-section__title">
                  <Shield size={16} aria-hidden /> Account
                </h3>
                <p className="sa-profile-hint">
                  Profile photo is managed from the avatar above. Name and email are system-managed.
                </p>
                <div className="sa-profile-grid">
                  <ReadField label="Full name" value={fullName || null} />
                  <ReadField label="Email" value={profile.email} />
                  <ReadField label="Role" value={roleName} />
                  {editing && form ? (
                    <label className="sa-profile-field sa-profile-field--span">
                      <span className="sa-profile-field__label">Bio</span>
                      <textarea
                        className="sa-profile-input"
                        rows={3}
                        value={form.bio}
                        onChange={(e) => setTextField('bio', e.target.value)}
                      />
                    </label>
                  ) : (
                    <ReadField label="Bio" value={profile.bio} />
                  )}
                </div>
              </section>
            )}

            {activeTab === 'professional' && (
              <section
                id="sa-profile-section-professional"
                className="sa-profile-section is-active"
                role="tabpanel"
              >
                <h3 className="sa-profile-section__title">
                  <Briefcase size={16} aria-hidden /> Professional
                </h3>
                <p className="sa-profile-hint">
                  Employee ID and joining date are system-managed.
                </p>
                <div className="sa-profile-grid">
                  <ReadField label="Employee ID" value={profile.employee_id} />
                  <ReadField label="Joining date" value={profile.joining_date} />
                  {editing && form ? (
                    <div className="sa-profile-field sa-profile-field--span">
                      <span className="sa-profile-field__label">Languages</span>
                      <div className="sa-profile-lang-row">
                        {parseProfileLanguages(form.languages).map((lang) => (
                          <button
                            key={lang}
                            type="button"
                            className="sa-profile-lang-chip"
                            onClick={() => removeLanguage(lang)}
                          >
                            {lang} ×
                          </button>
                        ))}
                      </div>
                      <div className="sa-profile-lang-add">
                        <input
                          className="sa-profile-input"
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
                  ) : (
                    <ReadField
                      label="Languages"
                      value={
                        (profile.languages || []).length
                          ? profile.languages.join(', ')
                          : null
                      }
                    />
                  )}
                </div>
              </section>
            )}

            {activeTab === 'contact' && (
              <section
                id="sa-profile-section-contact"
                className="sa-profile-section is-active"
                role="tabpanel"
              >
                <h3 className="sa-profile-section__title">
                  <Phone size={16} aria-hidden /> Contact
                </h3>
                <div className="sa-profile-grid">
                  {editing && form ? (
                    <>
                      <label className="sa-profile-field">
                        <span className="sa-profile-field__label">Phone</span>
                        <ProfilePhoneField
                          inputClassName="sa-profile-input"
                          phoneCode={form.phone_code}
                          phone={form.phone}
                          onPhoneCodeChange={(value) => setField('phone_code', value)}
                          onPhoneChange={(value) => setField('phone', value)}
                        />
                      </label>
                      <label className="sa-profile-field">
                        <span className="sa-profile-field__label">Emergency contact name</span>
                        <input
                          className="sa-profile-input"
                          maxLength={120}
                          value={form.emergency_contact_name}
                          onChange={(e) => setTextField('emergency_contact_name', e.target.value)}
                        />
                      </label>
                      <label className="sa-profile-field">
                        <span className="sa-profile-field__label">Emergency phone</span>
                        <input
                          className="sa-profile-input"
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
                      <label className="sa-profile-field">
                        <span className="sa-profile-field__label">Gender</span>
                        <select
                          className="sa-profile-input"
                          value={form.gender === '' || form.gender == null ? '' : form.gender}
                          onChange={(e) => {
                            const next = Number(e.target.value);
                            if (!isValidGender(next)) return;
                            setField('gender', next);
                          }}
                        >
                          <option value="">Select gender</option>
                          {GENDER_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <div className="sa-profile-field">
                        <DateInput
                          label="Date of birth"
                          className="profile-page-date-input"
                          value={form.date_of_birth || ''}
                          onChange={(e) => setField('date_of_birth', e.target.value)}
                          placeholder="DD/MM/YYYY"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <ReadField
                        label="Phone"
                        value={formatPhoneDisplay(profile.phone_code, profile.phone)}
                      />
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
    </SuperAdminLayout>
  );
}
