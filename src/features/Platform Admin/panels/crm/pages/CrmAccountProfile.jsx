import {
  changeCrmPassword,
  getCrmProfile,
  removeCrmPhoto,
  resolveCrmImageUrl,
  updateCrmProfile,
  uploadCrmPhoto,
} from "../../../shared/api/crmAccount";
import { mapCrmProfile } from "../../../shared/api/crmAccountModel";
import PortalProfile from "../../../shared/portal/profile/PortalProfile";

function mapProfile(body) {
  const mapped = mapCrmProfile(body);
  if (!mapped) return null;
  return { ...mapped, photoUrl: resolveCrmImageUrl(mapped.photoUrl) };
}

export default function CrmAccountProfile() {
  return (
    <PortalProfile
      portal="crm"
      panelLabel="CRM"
      title="Profile"
      loadProfile={getCrmProfile}
      updateProfile={updateCrmProfile}
      changePassword={changeCrmPassword}
      uploadPhoto={uploadCrmPhoto}
      removePhoto={removeCrmPhoto}
      mapProfile={mapProfile}
      resolveImageUrl={resolveCrmImageUrl}
    />
  );
}
