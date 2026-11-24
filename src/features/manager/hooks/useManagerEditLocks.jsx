import { useCallback, useMemo } from 'react';
import {
  useAdminOpdSettingsQuery,
  useUpdateAdminEditControlsMutation,
} from '@/features/manager/hooks/useOpdSettingsQuery';
import ManagerEditLockToggle from '@/features/manager/components/ManagerEditLockToggle';
import { normalizeAdminEdit } from '@/features/manager/constants/managerEditLocks';
import { toast } from '@/shared/utils/toast';

/**
 * Admin card locks shared by OPD + module settings panels.
 * @param {boolean} manageAdminEditLocks - true only in Admin Settings
 */
export function useAdminEditLocks(manageAdminEditLocks = false) {
  const settingsQuery = useAdminOpdSettingsQuery({
    enabled: Boolean(manageAdminEditLocks) || true,
  });
  const mutation = useUpdateAdminEditControlsMutation();

  const adminEdit = useMemo(
    () => normalizeAdminEdit(settingsQuery.data?.admin_edit),
    [settingsQuery.data?.admin_edit],
  );

  const canEdit = useCallback(
    (key) => manageAdminEditLocks || Boolean(adminEdit[key]),
    [manageAdminEditLocks, adminEdit],
  );

  const setAdminEditLock = useCallback(
    async (key, enabled) => {
      if (!manageAdminEditLocks || mutation.isPending) return;
      const next = { ...adminEdit, [key]: enabled };
      try {
        await mutation.mutateAsync(next);
        toast.success(
          enabled
            ? 'Admin can now edit this setting'
            : 'Admin edit locked for this setting',
        );
      } catch (err) {
        toast.error(err?.message || 'Failed to update Admin edit permission');
      }
    },
    [manageAdminEditLocks, mutation, adminEdit],
  );

  const setAdminEditLocks = useCallback(
    async (keys, enabled) => {
      if (!manageAdminEditLocks || mutation.isPending) return;
      const next = { ...adminEdit };
      for (const key of keys) next[key] = enabled;
      try {
        await mutation.mutateAsync(next);
        toast.success(
          enabled
            ? 'Manager can edit pricing and tax'
            : 'Pricing and tax edit is locked',
        );
      } catch (err) {
        toast.error(err?.message || 'Failed to update edit access');
      }
    },
    [manageAdminEditLocks, mutation, adminEdit],
  );

  const lockToggle = useCallback(
    (key, options = {}) =>
      manageAdminEditLocks ? (
        <ManagerEditLockToggle
          id={`admin-edit-${key}`}
          label={options.label}
          checked={Boolean(adminEdit[key])}
          disabled={mutation.isPending}
          onChange={(v) => setAdminEditLock(key, v)}
        />
      ) : null,
    [manageAdminEditLocks, adminEdit, mutation.isPending, setAdminEditLock],
  );

  return {
    adminEdit,
    canEdit,
    setAdminEditLock,
    setAdminEditLocks,
    lockToggle,
    adminEditSaving: mutation.isPending,
    locksLoading: settingsQuery.isLoading,
  };
}
