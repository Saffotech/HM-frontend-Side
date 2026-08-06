/**
 * IPD Profile — live GET/PUT `/ipd/profile`.
 */

import { useEffect, useState } from 'react';
import { EmptyState, Button, QueryFeedback } from '@/shared/components/common';
import { toast } from '@/shared/utils/toast';
import { getRoleLabel, toTitleCase } from '@/shared/utils/roleUtils';
import IpdPageHeader from '@/features/ipd/components/IpdPageHeader';
import { useIpdPermissionSet } from '@/features/ipd/hooks/useIpdPermission';
import {
  useIpdProfileQuery,
  useUpdateIpdProfileMutation,
} from '@/features/ipd/hooks/useIpdQuery';

function buildForm(profile) {
  return {
    qualification: profile?.qualification ?? '',
    experience_years:
      profile?.experience_years == null ? '' : String(profile.experience_years),
    bio: profile?.bio ?? '',
    languages: Array.isArray(profile?.languages)
      ? profile.languages.join(', ')
      : '',
    phone: profile?.phone ?? '',
    phone_code: profile?.phone_code ?? '+91',
    date_of_birth: profile?.date_of_birth ?? '',
    gender: profile?.gender ?? '',
  };
}

export default function IpdProfilePage() {
  const { canViewProfile, canUpdateProfile } = useIpdPermissionSet();
  const { data: profile, isLoading, isError, error, refetch } = useIpdProfileQuery({
    enabled: canViewProfile,
  });
  const updateMutation = useUpdateIpdProfileMutation();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(buildForm());

  useEffect(() => {
    if (profile && !editing) setForm(buildForm(profile));
  }, [profile, editing]);

  if (!canViewProfile) {
    return (
      <div className="ipd-page">
        <EmptyState
          title="Profile unavailable"
          description="You do not have permission to view the IPD profile."
        />
      </div>
    );
  }

  const displayName = toTitleCase(
    `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim()
  ) || profile?.email || '—';

  const onSave = async () => {
    if (!canUpdateProfile) {
      toast.error('You do not have permission to update profile');
      return;
    }
    try {
      const languages = form.languages
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean);
      await updateMutation.mutateAsync({
        qualification: form.qualification.trim() || null,
        experience_years:
          form.experience_years === '' ? null : Number(form.experience_years),
        bio: form.bio.trim() || null,
        languages,
        phone: form.phone.trim() || null,
        phone_code: form.phone_code.trim() || null,
        date_of_birth: form.date_of_birth || null,
        gender: form.gender || null,
      });
      toast.success('Profile updated');
      setEditing(false);
      refetch();
    } catch (err) {
      toast.error(err?.message || 'Could not update profile');
    }
  };

  return (
    <div className="ipd-page">
      <IpdPageHeader
        title="My Profile"
        subtitle="IPD staff account details"
        actions={
          editing ? (
            <div className="ipd-form-actions">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setEditing(false);
                  setForm(buildForm(profile));
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={onSave}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? 'Saving…' : 'Save'}
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              disabled={!canUpdateProfile}
              title={
                canUpdateProfile
                  ? 'Edit profile'
                  : 'You do not have permission to update profile'
              }
              onClick={() => setEditing(true)}
            >
              Edit profile
            </Button>
          )
        }
      />

      {isError ? (
        <div className="ipd-card">
          <div className="ipd-card__body">
            <QueryFeedback isError error={error} onRetry={refetch} />
          </div>
        </div>
      ) : null}

      {isLoading ? (
        <div className="ipd-skeleton" style={{ height: '8rem' }} />
      ) : (
        <div className="ipd-detail-grid">
          <div className="ipd-card">
            <div className="ipd-card__head">
              <h2 className="ipd-card__title">Account</h2>
            </div>
            <div className="ipd-card__body">
              <div className="ipd-kv">
                <span className="ipd-kv__label">Name</span>
                <span className="ipd-kv__value">{displayName}</span>
                <span className="ipd-kv__label">Email</span>
                <span className="ipd-kv__value">{profile?.email || '—'}</span>
                <span className="ipd-kv__label">Role</span>
                <span className="ipd-kv__value">
                  {getRoleLabel({ role: profile?.role?.name || 'ipd' })}
                </span>
                <span className="ipd-kv__label">Department</span>
                <span className="ipd-kv__value">
                  {profile?.department?.name || '—'}
                </span>
                <span className="ipd-kv__label">Employee ID</span>
                <span className="ipd-kv__value">{profile?.employee_id || '—'}</span>
              </div>
            </div>
          </div>

          <div className="ipd-card">
            <div className="ipd-card__head">
              <h2 className="ipd-card__title">Professional</h2>
            </div>
            <div className="ipd-card__body">
              {editing ? (
                <div className="ipd-form-grid">
                  {[
                    ['qualification', 'Qualification'],
                    ['experience_years', 'Experience (years)'],
                    ['phone', 'Phone'],
                    ['phone_code', 'Phone code'],
                    ['date_of_birth', 'Date of birth'],
                    ['gender', 'Gender'],
                    ['languages', 'Languages (comma separated)'],
                  ].map(([key, label]) => (
                    <div key={key} className="ipd-toolbar__field">
                      <label className="ipd-toolbar__label" htmlFor={`ipd-prof-${key}`}>
                        {label}
                      </label>
                      <input
                        id={`ipd-prof-${key}`}
                        className="ipd-input"
                        type={key === 'date_of_birth' ? 'date' : 'text'}
                        value={form[key]}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, [key]: e.target.value }))
                        }
                      />
                    </div>
                  ))}
                  <div className="ipd-toolbar__field ipd-form-grid--full">
                    <label className="ipd-toolbar__label" htmlFor="ipd-prof-bio">
                      Bio
                    </label>
                    <textarea
                      id="ipd-prof-bio"
                      className="ipd-textarea"
                      value={form.bio}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, bio: e.target.value }))
                      }
                    />
                  </div>
                </div>
              ) : (
                <div className="ipd-kv">
                  <span className="ipd-kv__label">Qualification</span>
                  <span className="ipd-kv__value">{profile?.qualification || '—'}</span>
                  <span className="ipd-kv__label">Experience</span>
                  <span className="ipd-kv__value">
                    {profile?.experience_years != null
                      ? `${profile.experience_years} year(s)`
                      : '—'}
                  </span>
                  <span className="ipd-kv__label">Phone</span>
                  <span className="ipd-kv__value">
                    {[profile?.phone_code, profile?.phone].filter(Boolean).join(' ') ||
                      '—'}
                  </span>
                  <span className="ipd-kv__label">Languages</span>
                  <span className="ipd-kv__value">
                    {Array.isArray(profile?.languages) && profile.languages.length
                      ? profile.languages.join(', ')
                      : '—'}
                  </span>
                  <span className="ipd-kv__label">Bio</span>
                  <span className="ipd-kv__value">{profile?.bio || '—'}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
