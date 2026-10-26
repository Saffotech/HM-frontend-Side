import PortalProfile from "../../../../shared/portal/profile/PortalProfile";
import {
  changePlatformAdminPassword,
  getPlatformAdminProfile,
  mapPlatformAdminProfile,
  removePlatformAdminPhoto,
  resolvePlatformImageUrl,
  updatePlatformAdminProfile,
  uploadPlatformAdminPhoto,
} from "../../../../shared/api/platformAdminProfile";

export default function MyProfile() {
  return (
    <PortalProfile
      portal="platform"
      panelLabel="Platform"
      title="My Profile"
      loadProfile={getPlatformAdminProfile}
      updateProfile={updatePlatformAdminProfile}
      changePassword={changePlatformAdminPassword}
      uploadPhoto={uploadPlatformAdminPhoto}
      removePhoto={removePlatformAdminPhoto}
      mapProfile={mapPlatformAdminProfile}
      resolveImageUrl={resolvePlatformImageUrl}
    />
  );
}
