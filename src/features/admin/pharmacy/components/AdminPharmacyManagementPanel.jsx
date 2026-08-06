import { useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  ClipboardList,
  PackageCheck,
  Save,
  UserCircle2,
} from 'lucide-react';
import {
  useAssignRolePermissionsMutation,
  useAdminRolesQuery,
} from '@/shared/hooks/queries/useAdminQuery';
import { useRolePermissionsCatalogQuery } from '@/features/admin/nurse/hooks/useNurseAdminQueries';
import { useAdminEditLocks } from '@/features/admin/hooks/useAdminEditLocks';
import { PERMISSION_GROUPS } from '@/features/admin/pharmacy/constants/pharmacyManagementConfig';
import { Button, QueryFeedback } from '@/shared/components/common';
import { toast } from '@/shared/utils/toast';
import '@/features/admin/styles/adminOpdSettings.css';

const TARGET_ROLE_KEY = 'pharmacist';
const SECTION_TABS = [
  { id: 'access', label: 'Access', icon: ClipboardList },
  { id: 'dispense', label: 'Dispense', icon: PackageCheck },
  { id: 'profile', label: 'Profile', icon: UserCircle2 },
];
const SECTION_LOCK_KEYS = {
  access: 'pharmacy_access',
  dispense: 'pharmacy_dispense',
  profile: 'pharmacy_profile',
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

function PermissionModuleList({
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

export default function AdminPharmacyManagementPanel({ manageAdminEditLocks = false }) {
  const [activeSection, setActiveSection] = useState(SECTION_TABS[0].id);
  const [selectedByRole, setSelectedByRole] = useState({});
  const [isDirty, setIsDirty] = useState(false);
  const { canEdit, lockToggle } = useAdminEditLocks(manageAdminEditLocks);
  const rolesQ = useAdminRolesQuery();
  const permsQ = useRolePermissionsCatalogQuery({ enabled: true });
  const saveMut = useAssignRolePermissionsMutation();

  const activeSectionLockKey = SECTION_LOCK_KEYS[activeSection];

  const allPharmacyKeys = useMemo(
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

  const serverPermSignature = useMemo(() => {
    if (!rolesQ.data || !targetRoleKey) return null;
    const role = roleMap.get(targetRoleKey);
    if (!role) return null;
    return (role.permissions ?? [])
      .filter((key) => allPharmacyKeys.has(key))
      .slice()
      .sort()
      .join('|');
  }, [allPharmacyKeys, roleMap, rolesQ.data, targetRoleKey]);

  useEffect(() => {
    if (isDirty) return;
    if (serverPermSignature == null) return;
    const key = targetRoleKey || TARGET_ROLE_KEY;
    setSelectedByRole({
      [key]: new Set(serverPermSignature ? serverPermSignature.split('|') : []),
    });
  }, [isDirty, serverPermSignature, targetRoleKey]);

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
      toast.error('Role "pharmacist" is not available in this hospital.');
      return;
    }
    const role = roleMap.get(targetRoleKey);
    if (!role) {
      toast.error(`Role "${targetRoleKey}" is not available in this hospital.`);
      return;
    }
    if (serverPermSignature == null) {
      toast.error('Pharmacy permissions are still loading. Try again in a moment.');
      return;
    }

    const selectedKeys = [...(selectedByRole[targetRoleKey] ?? new Set())];
    const existingCount = (role.permissions ?? []).filter((key) => allPharmacyKeys.has(key)).length;
    if (selectedKeys.length === 0 && existingCount > 0) {
      toast.error('Cannot save an empty permission set. Reload the page and try again.');
      return;
    }

    const existing = role.permissions ?? [];
    const keepOther = existing.filter((key) => !allPharmacyKeys.has(key));
    const merged = [...new Set([...keepOther, ...selectedKeys])];

    const missing = merged.filter((key) => !permissionsByName.has(key));
    if (missing.length) {
      toast.error(`Missing permission IDs in catalog: ${missing.slice(0, 3).join(', ')}`);
      return;
    }

    const permissionIds = merged.map((key) => permissionsByName.get(key));
    try {
      await saveMut.mutateAsync({ roleId: role.id, permissionIds });
      setIsDirty(false);
      toast.success('Pharmacy permissions saved. Pharmacy screens refresh within a few seconds.');
      try {
        const bump = String(Date.now());
        localStorage.setItem('hms:pharmacy-permissions-bump', bump);
        window.dispatchEvent(new Event('hms:pharmacy-permissions-bump'));
      } catch {
        /* ignore */
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
          <h2 className="admin-card__title">Pharmacy settings</h2>
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
        <div className="aos-section-tabs" role="tablist" aria-label="Pharmacy settings sections">
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
            icon={ClipboardList}
            tone="blue"
            defaultOpen
            action={lockToggle('pharmacy_access')}
            locked={!canEdit('pharmacy_access')}
          >
            <PermissionModuleList
              modules={['Prescriptions', 'Notifications']}
              targetRoleKey={targetRoleKey}
              selectedByRole={selectedByRole}
              togglePermission={togglePermission}
              disabled={!canEdit('pharmacy_access')}
            />
          </SectionCard>
        ) : null}

        {activeSection === 'dispense' ? (
          <SectionCard
            title="Dispense"
            icon={PackageCheck}
            tone="teal"
            defaultOpen
            action={lockToggle('pharmacy_dispense')}
            locked={!canEdit('pharmacy_dispense')}
          >
            <PermissionModuleList
              modules={['Dispense']}
              targetRoleKey={targetRoleKey}
              selectedByRole={selectedByRole}
              togglePermission={togglePermission}
              disabled={!canEdit('pharmacy_dispense')}
            />
          </SectionCard>
        ) : null}

        {activeSection === 'profile' ? (
          <SectionCard
            title="Profile"
            icon={UserCircle2}
            tone="indigo"
            defaultOpen
            action={lockToggle('pharmacy_profile')}
            locked={!canEdit('pharmacy_profile')}
          >
            <PermissionModuleList
              modules={['Profile']}
              targetRoleKey={targetRoleKey}
              selectedByRole={selectedByRole}
              togglePermission={togglePermission}
              disabled={!canEdit('pharmacy_profile')}
            />
          </SectionCard>
        ) : null}

        <div className="aos-form__footer">
          <Button
            type="button"
            onClick={() => persistRolePermissions()}
            disabled={saveMut.isPending || !targetRoleKey || !canEdit(activeSectionLockKey)}
            title={
              !canEdit(activeSectionLockKey)
                ? 'Locked by Super Admin'
                : targetRoleKey
                  ? `Saving on role: ${targetRoleKey}`
                  : 'Pharmacist role not available for permission control'
            }
          >
            <Save size={16} />
            {saveMut.isPending ? 'Saving…' : 'Save Pharmacy Permissions'}
          </Button>
        </div>
      </QueryFeedback>
    </div>
  );
}
