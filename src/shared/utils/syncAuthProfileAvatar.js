/**
 * Keep header/sidebar avatar in sync with staff profile photo.
 */

import { useAuthStore } from '@/shared/store/useAuthStore';

/**
 * @param {{ profile?: { profile_image_url?: string | null } } | { profile_image_url?: string | null } | null | undefined} data
 */
export function syncAuthProfileAvatar(data) {
  const profile = data?.profile ?? data;
  if (!profile || typeof profile !== 'object') return;

  const nextUrl =
    profile.profile_image_url === undefined ? undefined : profile.profile_image_url || null;

  if (nextUrl === undefined) return;

  const auth = useAuthStore.getState?.();
  if (!auth?.updateUser || !auth.user) return;

  const current = auth.user.profile_image_url || null;
  if (current === nextUrl) return;

  auth.updateUser({ profile_image_url: nextUrl });
}
