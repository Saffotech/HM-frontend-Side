/**
 * Keep header/sidebar Avatar in sync with the latest profile image URL.
 */

import { useAuthStore } from '@/shared/store/useAuthStore';

export function syncAuthProfileImage(profileOrUrl) {
  const updateUser = useAuthStore.getState()?.updateUser;
  if (typeof updateUser !== 'function') return;

  const url =
    typeof profileOrUrl === 'string' || profileOrUrl == null
      ? profileOrUrl
      : profileOrUrl?.profile_image_url ?? null;

  updateUser({ profile_image_url: url || null });
}
