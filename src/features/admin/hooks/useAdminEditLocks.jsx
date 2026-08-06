import { useCallback, useMemo } from 'react';
import {
  useAdminOpdSettingsQuery,
  useUpdateAdminEditControlsMutation,
} from '@/features/admin/hooks/useOpdSettingsQuery';
import AdminEditLockToggle from '@/features/admin/components/AdminEditLockToggle';
import { normalizeAdminEdit } from '@/features/admin/constants/adminEditLocks';
import { toast } from '@/shared/utils/toast';

/**
 * Super Admin card locks shared by OPD + module settings panels.
 * @param {boolean} manageAdminEditLocks - true only in Super Admin Settings
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

  const lockToggle = useCallback(
    (key) =>
      manageAdminEditLocks ? (
        <AdminEditLockToggle
          id={`admin-edit-${key}`}
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
    lockToggle,
    adminEditSaving: mutation.isPending,
    locksLoading: settingsQuery.isLoading,
  };
}
