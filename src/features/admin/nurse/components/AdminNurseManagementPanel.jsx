import { useEffect, useMemo, useState } from 'react';
import {
  BellRing,
  ChevronDown,
  Save,
  ShieldCheck,
  Stethoscope,
  UserCircle2,
} from 'lucide-react';
import {
  useAssignRolePermissionsMutation,
  useAdminRolesQuery,
} from '@/shared/hooks/queries/useAdminQuery';
import { useRolePermissionsCatalogQuery } from '@/features/admin/nurse/hooks/useNurseAdminQueries';
import { useAdminEditLocks } from '@/features/admin/hooks/useAdminEditLocks';
import { PERMISSION_GROUPS } from '@/features/admin/nurse/constants/nurseManagementConfig';
import { Button, QueryFeedback } from '@/shared/components/common';
import { toast } from '@/shared/utils/toast';
import '@/features/admin/styles/adminOpdSettings.css';

const TARGET_ROLE_KEY = 'nurse';
const SECTION_TABS = [
  { id: 'access', label: 'Access', icon: UserCircle2 },
  { id: 'clinical', label: 'Clinical', icon: Stethoscope },
  { id: 'operations', label: 'Operations', icon: BellRing },
];
const SECTION_LOCK_KEYS = {
  access: 'nurse_access',
  clinical: 'nurse_clinical',
  operations: 'nurse_operations',
};

function SectionCard({
  title,
  icon: Icon,
  children,
  defaultOpen = false,
  tone = 'blue',
  action = null,
  locked = false,
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section
      className={`aos-card aos-card--accordion aos-card--tone-${tone}${open ? ' is-open' : ''}${
        locked ? ' aos-card--locked' : ''
      }`}
    >
      <div className="aos-card__head aos-card__head--row">
        <button
          type="button"
          className="aos-card__head-toggle"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          <div className="aos-card__title-wrap">
            {Icon ? (
              <span className="aos-card__icon" aria-hidden>
                <Icon size={16} strokeWidth={2.2} />
              </span>
            ) : null}
            <h3 className="aos-card__title">{title}</h3>
          </div>
          <ChevronDown size={18} className={`aos-card__chevron${open ? ' is-open' : ''}`} />
        </button>
        {action ? <div className="aos-card__head-action">{action}</div> : null}
      </div>
      {open ? (
        <div className="aos-card__body">
          {locked ? (
            <p className="aos-locked-banner">
              Locked by Super Admin — you can view these settings but cannot change them.
            </p>
          ) : null}
          {children}
        </div>
      ) : null}
    </section>
  );
}

function PermissionToggles({
  modules,
  targetRoleKey,
  selectedByRole,
  togglePermission,
  disabled = false,
}) {
  return PERMISSION_GROUPS.filter((group) => modules.includes(group.module)).map((group) => (
    <div key={group.module} className="aos-field">
      <strong>{group.module}</strong>
      <div className="aos-toggle-list">
        {group.permissions.map((perm) => (
          <label key={perm.key} className="aos-toggle">
            <span className="aos-toggle__text">
              <strong>{perm.name}</strong>
            </span>
            <input
              type="checkbox"
              className="aos-toggle__input"
              disabled={disabled}
              checked={Boolean(
                targetRoleKey ? selectedByRole[targetRoleKey]?.has(perm.key) : false,
              )}
              onChange={() =>
                !disabled && targetRoleKey && togglePermission(targetRoleKey, perm.key)
              }
            />
            <span className="aos-toggle__track" aria-hidden />
          </label>
        ))}
      </div>
    </div>
  ));
}

export default function AdminNurseManagementPanel({ manageAdminEditLocks = false }) {
  const [activeSection, setActiveSection] = useState(SECTION_TABS[0].id);
  const [selectedByRole, setSelectedByRole] = useState({});
  const [isDirty, setIsDirty] = useState(false);
  const { canEdit, lockToggle } = useAdminEditLocks(manageAdminEditLocks);
  const rolesQ = useAdminRolesQuery();
  const permsQ = useRolePermissionsCatalogQuery({ enabled: true });
  const saveMut = useAssignRolePermissionsMutation();

  const activeSectionLockKey = SECTION_LOCK_KEYS[activeSection];

  const allNurseKeys = useMemo(
    () => new Set(PERMISSION_GROUPS.flatMap((group) => group.permissions.map((p) => p.key))),
    [],
  );

  const roleMap = useMemo(() => {
    const map = new Map();
    (rolesQ.data ?? []).forEach((role) => map.set(String(role.name).toLowerCase(), role));
    return map;
  }, [rolesQ.data]);

  const targetRoleKey = useMemo(
    () => (roleMap.has(TARGET_ROLE_KEY) ? TARGET_ROLE_KEY : null),
    [roleMap],
  );

  const serverNursePermSignature = useMemo(() => {
    if (!rolesQ.data || !targetRoleKey) return null;
    const role = roleMap.get(targetRoleKey);
    if (!role) return null;
    return (role.permissions ?? [])
      .filter((key) => allNurseKeys.has(key))
      .slice()
      .sort()
      .join('|');
  }, [allNurseKeys, roleMap, rolesQ.data, targetRoleKey]);

  useEffect(() => {
    if (isDirty) return;
    // Wait until roles are loaded so we never seed an empty Set and wipe on save.
    if (serverNursePermSignature == null) return;
    const key = targetRoleKey || TARGET_ROLE_KEY;
    setSelectedByRole({
      [key]: new Set(
        serverNursePermSignature ? serverNursePermSignature.split('|') : [],
      ),
    });
  }, [isDirty, serverNursePermSignature, targetRoleKey]);

  const permissionsByName = useMemo(() => {
    const map = new Map();
    (permsQ.data ?? []).forEach((perm) => {
      if (perm?.name && perm?.id != null) map.set(perm.name, perm.id);
    });
    return map;
  }, [permsQ.data]);

  const togglePermission = (roleKey, key) => {
    setIsDirty(true);
    setSelectedByRole((prev) => {
      const current = new Set(prev[roleKey] ?? []);
      if (current.has(key)) current.delete(key);
      else current.add(key);
      return { ...prev, [roleKey]: current };
    });
  };

  const persistRolePermissions = async () => {
    if (!targetRoleKey) {
      toast.error('Role "nurse" is not available in this hospital.');
      return;
    }
    const role = roleMap.get(targetRoleKey);
    if (!role) {
      toast.error(`Role "${targetRoleKey}" is not available in this hospital.`);
      return;
    }
    if (serverNursePermSignature == null) {
      toast.error('Nurse permissions are still loading. Try again in a moment.');
      return;
    }

    const selectedNurseKeys = [...(selectedByRole[targetRoleKey] ?? new Set())];
    const existingNurseCount = (role.permissions ?? []).filter((key) => allNurseKeys.has(key)).length;
    // Prevent accidental wipe if state was never hydrated.
    if (selectedNurseKeys.length === 0 && existingNurseCount > 0) {
      toast.error('Cannot save an empty permission set. Reload the page and try again.');
      return;
    }

    const existing = role.permissions ?? [];
    const keepNonNurse = existing.filter((key) => !allNurseKeys.has(key));
    const merged = [...new Set([...keepNonNurse, ...selectedNurseKeys])];

    const missing = merged.filter((key) => !permissionsByName.has(key));
    if (missing.length) {
      toast.error(`Missing permission IDs in catalog: ${missing.slice(0, 3).join(', ')}`);
      return;
    }

    const permissionIds = merged.map((key) => permissionsByName.get(key));
    try {
      await saveMut.mutateAsync({ roleId: role.id, permissionIds });
      setIsDirty(false);
      toast.success('Nurse permissions saved. Nurse screens refresh within a few seconds.');
      try {
        const bump = String(Date.now());
        localStorage.setItem('hms:nurse-permissions-bump', bump);
        window.dispatchEvent(new Event('hms:nurse-permissions-bump'));
      } catch {
        /* ignore storage failures */
      }
      rolesQ.refetch();
    } catch (error) {
      toast.error(error?.message || 'Failed to save permissions.');
    }
  };

  return (
    <div className="aos-page">
      <div className="aos-page__intro">
        <div>
          <h2 className="admin-card__title">Nurse settings</h2>
        </div>
      </div>

      <QueryFeedback
        isLoading={rolesQ.isLoading || permsQ.isLoading}
        isError={rolesQ.isError || permsQ.isError}
        error={rolesQ.error || permsQ.error}
        onRetry={() => {
          rolesQ.refetch();
          permsQ.refetch();
        }}
      >
        <div className="aos-section-tabs" role="tablist" aria-label="Nurse settings sections">
          {SECTION_TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeSection === tab.id}
                className={`aos-section-tab${activeSection === tab.id ? ' is-active' : ''}`}
                onClick={() => setActiveSection(tab.id)}
              >
                <Icon size={15} strokeWidth={2.2} aria-hidden />
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeSection === 'access' ? (
          <SectionCard
            title="Access"
            icon={UserCircle2}
            tone="blue"
            defaultOpen
            action={lockToggle('nurse_access')}
            locked={!canEdit('nurse_access')}
          >
            <PermissionToggles
              modules={['Patients', 'Profile', 'Notifications']}
              targetRoleKey={targetRoleKey}
              selectedByRole={selectedByRole}
              togglePermission={togglePermission}
              disabled={!canEdit('nurse_access')}
            />
          </SectionCard>
        ) : null}

        {activeSection === 'clinical' ? (
          <SectionCard
            title="Clinical"
            icon={Stethoscope}
            tone="teal"
            defaultOpen
            action={lockToggle('nurse_clinical')}
            locked={!canEdit('nurse_clinical')}
          >
            <PermissionToggles
              modules={['Vitals', 'Nursing Notes', 'Medication', 'Doctor Visits']}
              targetRoleKey={targetRoleKey}
              selectedByRole={selectedByRole}
              togglePermission={togglePermission}
              disabled={!canEdit('nurse_clinical')}
            />
          </SectionCard>
        ) : null}

        {activeSection === 'operations' ? (
          <SectionCard
            title="Operations"
            icon={ShieldCheck}
            tone="indigo"
            defaultOpen
            action={lockToggle('nurse_operations')}
            locked={!canEdit('nurse_operations')}
          >
            <PermissionToggles
              modules={['Emergency Alerts']}
              targetRoleKey={targetRoleKey}
              selectedByRole={selectedByRole}
              togglePermission={togglePermission}
              disabled={!canEdit('nurse_operations')}
            />
          </SectionCard>
        ) : null}

        <div className="aos-form__footer">
          <Button
            onClick={() => persistRolePermissions()}
            disabled={saveMut.isPending || !targetRoleKey || !canEdit(activeSectionLockKey)}
            title={
              !canEdit(activeSectionLockKey)
                ? 'Locked by Super Admin'
                : targetRoleKey
                  ? `Saving on role: ${targetRoleKey}`
                  : 'Nurse role not available for permission control'
            }
          >
            <Save size={16} />
            {saveMut.isPending ? 'Saving…' : 'Save Nurse Permissions'}
          </Button>
        </div>
      </QueryFeedback>
    </div>
  );
}
