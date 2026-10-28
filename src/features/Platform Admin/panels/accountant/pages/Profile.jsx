import PortalProfile from "../../../shared/portal/profile/PortalProfile";
import {
  changePortalPassword,
  getAccountantProfile,
  mapAccountantProfile,
  removeProfilePhoto,
  resolveAccountantImageUrl,
  updateAccountantProfile,
  uploadProfilePhoto,
} from "../../../shared/services/portalAccount";

export default function Profile() {
  return (
    <PortalProfile
      portal="accountant"
      panelLabel="Accounts"
      loadProfile={getAccountantProfile}
      updateProfile={updateAccountantProfile}
      changePassword={changePortalPassword}
      uploadPhoto={uploadProfilePhoto}
      removePhoto={removeProfilePhoto}
      mapProfile={mapAccountantProfile}
      resolveImageUrl={resolveAccountantImageUrl}
    />
  );
}
