import { useEffect, useMemo, useState } from 'react';
import {
  Briefcase,
  Building2,
  Calendar,
  Edit3,
  HeartPulse,
  Shield,
  ShieldCheck,
  User,
  X,
} from 'lucide-react';
import NurseLayout from '@/features/nurse/components/NurseLayout';
import { useAuth } from '@/shared/hooks/useAuth';
import { toast } from '@/shared/utils/toast';
import './NurseProfilePage.css';

const SHIFT_OPTIONS = ['Day', 'Evening', 'Night', 'Rotating'];
const DEPARTMENT_OPTIONS = ['Nursing', 'ICU', 'Emergency', 'OPD', 'Pediatrics', 'Maternity'];

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function buildFormFromUser(user) {
  return {
    first_name: user.first_name ?? '',
    last_name: user.last_name ?? '',
    email: user.email ?? '',
    phone: user.phone ?? '',
    department: user.department ?? 'Nursing',
    employee_id: user.employee_id ?? '',
    shift: user.shift ?? 'Day',
    emergency_contact_name: user.emergency_contact_name ?? '',
    emergency_contact_phone: user.emergency_contact_phone ?? '',
    address: user.address ?? '',
    bio: user.bio ?? '',
  };
}

function ReadField({ label, value, empty = 'Not set' }) {
  return (
    <div className="nurse-field">
      <label>{label}</label>
      <p className={`nurse-profile-readonly ${value ? '' : 'nurse-profile-readonly--empty'}`}>
        {value || empty}
      </p>
    </div>
  );
}

export default function NurseProfilePage() {
  const { user, updateUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(() => (user ? buildFormFromUser(user) : null));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user && !editing) {
      setForm(buildFormFromUser(user));
    }
  }, [user, editing]);

  const displayName = useMemo(() => {
    if (!user) return '';
    if (editing && form) {
      return `${form.first_name} ${form.last_name}`.trim() || user.full_name;
    }
    return user.full_name || `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim();
  }, [user, editing, form]);

  const avatarInitial = (editing ? form?.first_name : user?.first_name)?.charAt(0)?.toUpperCase() || 'N';

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleCancel = () => {
    setForm(buildFormFromUser(user));
    setEditing(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.first_name.trim()) {
      toast.error('First name is required');
      return;
    }
    if (!form.email.trim()) {
      toast.error('Email is required');
      return;
    }
    setSaving(true);
    try {
      updateUser({
        ...form,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim(),
      });
      toast.success('Profile updated');
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  if (!user || !form) {
    return (
      <NurseLayout>
        <p>Loading profile…</p>
      </NurseLayout>
    );
  }

  const permissions = user.permissions || [];
  const roleLabel = `${(user.role || 'nurse').replace(/_/g, ' ')} Staff`;

  return (
    <NurseLayout>
      <div className="nurse-page nurse-max-w-wide nurse-profile-page">
        <div className="nurse-profile-page__toolbar">
          {editing ? (
            <>
              <button
                type="button"
                className="nurse-btn nurse-btn--secondary"
                onClick={handleCancel}
                disabled={saving}
              >
                <X size={16} />
                Cancel
              </button>
              <button
                type="submit"
                form="nurse-profile-form"
                className="nurse-btn nurse-btn--primary"
                disabled={saving}
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </>
          ) : (
            <button type="button" className="nurse-btn nurse-btn--primary" onClick={() => setEditing(true)}>
              <Edit3 size={16} />
              Edit profile
            </button>
          )}
        </div>

        <div className="nurse-card nurse-profile-card">
          <div className="nurse-profile-head">
            <div className="nurse-profile-avatar" aria-hidden>
              {avatarInitial}
            </div>
            <div className="nurse-profile-head__meta">
              <h2 className="nurse-profile-head__name">{displayName}</h2>
              <p className="nurse-profile-head__role">{roleLabel}</p>
              {user.is_active !== false && <span className="nurse-profile-head__badge">Active</span>}
            </div>
          </div>

          <form id="nurse-profile-form" className="nurse-profile-body" onSubmit={handleSave}>
            <section className="nurse-profile-section">
              <h3 className="nurse-profile-section__title">
                <User size={18} />
                Personal information
              </h3>
              <div className="nurse-profile-fields">
                {editing ? (
                  <>
                    <div className="nurse-field">
                      <label htmlFor="profile-first-name">First name</label>
                      <input
                        id="profile-first-name"
                        type="text"
                        className="nurse-input"
                        value={form.first_name}
                        onChange={(e) => setField('first_name', e.target.value)}
                        required
                      />
                    </div>
                    <div className="nurse-field">
                      <label htmlFor="profile-last-name">Last name</label>
                      <input
                        id="profile-last-name"
                        type="text"
                        className="nurse-input"
                        value={form.last_name}
                        onChange={(e) => setField('last_name', e.target.value)}
                      />
                    </div>
                    <div className="nurse-field">
                      <label htmlFor="profile-email">Email</label>
                      <input
                        id="profile-email"
                        type="email"
                        className="nurse-input"
                        value={form.email}
                        onChange={(e) => setField('email', e.target.value)}
                        required
                      />
                    </div>
                    <div className="nurse-field">
                      <label htmlFor="profile-phone">Phone</label>
                      <input
                        id="profile-phone"
                        type="tel"
                        className="nurse-input"
                        placeholder="+91 98765 43210"
                        value={form.phone}
                        onChange={(e) => setField('phone', e.target.value)}
                      />
                    </div>
                    <div className="nurse-field nurse-profile-field--span-4">
                      <label htmlFor="profile-address">Address</label>
                      <textarea
                        id="profile-address"
                        className="nurse-textarea"
                        rows={2}
                        placeholder="Street, city, state, PIN"
                        value={form.address}
                        onChange={(e) => setField('address', e.target.value)}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <ReadField label="First name" value={user.first_name} />
                    <ReadField label="Last name" value={user.last_name} />
                    <ReadField label="Email" value={user.email} />
                    <ReadField label="Phone" value={user.phone} />
                    <div className="nurse-field nurse-profile-field--span-4">
                      <label>Address</label>
                      <p
                        className={`nurse-profile-readonly ${user.address ? '' : 'nurse-profile-readonly--empty'}`}
                      >
                        {user.address || 'Not set'}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </section>

            <section className="nurse-profile-section">
              <h3 className="nurse-profile-section__title">
                <Briefcase size={18} />
                Work details
              </h3>
              <div className="nurse-profile-fields">
                {editing ? (
                  <>
                    <div className="nurse-field">
                      <label htmlFor="profile-department">Department</label>
                      <select
                        id="profile-department"
                        className="nurse-select"
                        value={form.department}
                        onChange={(e) => setField('department', e.target.value)}
                      >
                        {DEPARTMENT_OPTIONS.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="nurse-field">
                      <label htmlFor="profile-employee-id">Employee ID</label>
                      <input
                        id="profile-employee-id"
                        type="text"
                        className="nurse-input"
                        placeholder="e.g. NUR-0042"
                        value={form.employee_id}
                        onChange={(e) => setField('employee_id', e.target.value)}
                      />
                    </div>
                    <div className="nurse-field">
                      <label htmlFor="profile-shift">Preferred shift</label>
                      <select
                        id="profile-shift"
                        className="nurse-select"
                        value={form.shift}
                        onChange={(e) => setField('shift', e.target.value)}
                      >
                        {SHIFT_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="nurse-field">
                      <label htmlFor="profile-bio">About</label>
                      <textarea
                        id="profile-bio"
                        className="nurse-textarea"
                        rows={2}
                        placeholder="Brief professional summary"
                        value={form.bio}
                        onChange={(e) => setField('bio', e.target.value)}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <ReadField label="Department" value={user.department} />
                    <ReadField label="Employee ID" value={user.employee_id} />
                    <ReadField label="Preferred shift" value={user.shift} />
                    <ReadField label="About" value={user.bio} />
                  </>
                )}
              </div>
            </section>

            <section className="nurse-profile-section">
              <h3 className="nurse-profile-section__title">
                <HeartPulse size={18} />
                Emergency contact
              </h3>
              <div className="nurse-profile-fields nurse-profile-fields--2">
                {editing ? (
                  <>
                    <div className="nurse-field">
                      <label htmlFor="profile-ec-name">Contact name</label>
                      <input
                        id="profile-ec-name"
                        type="text"
                        className="nurse-input"
                        value={form.emergency_contact_name}
                        onChange={(e) => setField('emergency_contact_name', e.target.value)}
                      />
                    </div>
                    <div className="nurse-field">
                      <label htmlFor="profile-ec-phone">Contact phone</label>
                      <input
                        id="profile-ec-phone"
                        type="tel"
                        className="nurse-input"
                        value={form.emergency_contact_phone}
                        onChange={(e) => setField('emergency_contact_phone', e.target.value)}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <ReadField label="Contact name" value={user.emergency_contact_name} />
                    <ReadField label="Contact phone" value={user.emergency_contact_phone} />
                  </>
                )}
              </div>
            </section>

            <section className="nurse-profile-section">
              <h3 className="nurse-profile-section__title">
                <Building2 size={18} />
                Account
              </h3>
              <div className="nurse-profile-fields">
                <div className="nurse-field">
                  <label>User ID</label>
                  <p className="nurse-profile-readonly">{user.id ?? user.user_id ?? '—'}</p>
                </div>
                <div className="nurse-field">
                  <label>Role</label>
                  <p className="nurse-profile-readonly" style={{ textTransform: 'capitalize' }}>
                    {(user.role || 'nurse').replace(/_/g, ' ')}
                  </p>
                </div>
                <div className="nurse-field">
                  <label>
                    <Calendar size={12} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 4 }} />
                    Member since
                  </label>
                  <p className="nurse-profile-readonly">{formatDate(user.created_at)}</p>
                </div>
                <div className="nurse-field">
                  <label>Status</label>
                  <p className="nurse-profile-readonly">
                    {user.is_active === false ? 'Inactive' : 'Active'}
                  </p>
                </div>
              </div>
            </section>

            <section className="nurse-profile-section nurse-profile-perms">
              <h3 className="nurse-profile-section__title">
                <Shield size={18} />
                Permissions
              </h3>
              <div className="nurse-perm-list">
                {permissions.length ? (
                  permissions.map((perm) => (
                    <span key={perm} className="nurse-perm-chip">
                      <ShieldCheck size={12} /> {perm}
                    </span>
                  ))
                ) : (
                  <span className="nurse-profile-readonly nurse-profile-readonly--muted">
                    No explicit permissions assigned.
                  </span>
                )}
              </div>
            </section>
          </form>
        </div>
      </div>
    </NurseLayout>
  );
}
