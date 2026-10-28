import { createElement, useCallback, useState } from 'react';
import ConfirmDialog from '@/shared/components/ConfirmDialog';

export default function useLogoutConfirmation(onConfirm) {
  const [isOpen, setIsOpen] = useState(false);
  const close = useCallback(() => setIsOpen(false), []);
  const requestLogout = useCallback(() => setIsOpen(true), []);
  const confirmLogout = useCallback(() => {
    setIsOpen(false);
    onConfirm();
  }, [onConfirm]);

  return {
    requestLogout,
    dialog: createElement(ConfirmDialog, {
      isOpen,
      title: 'Confirm logout',
      message: 'Are you sure you want to log out?',
      confirmLabel: 'Log out',
      onConfirm: confirmLogout,
      onCancel: close,
    }),
  };
}
