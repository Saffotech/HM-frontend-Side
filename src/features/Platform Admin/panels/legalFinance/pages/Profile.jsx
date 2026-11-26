import PortalProfile from "../../../shared/portal/profile/PortalProfile";
import {
  changeLegalFinancePassword,
  getLegalFinanceProfile,
  mapLegalFinanceProfile,
  removeLegalFinancePhoto,
  resolveLegalFinanceImageUrl,
  updateLegalFinanceProfile,
  uploadLegalFinancePhoto,
} from "../../../shared/api/legalFinanceAccount";

export default function Profile() {
  return (
    <PortalProfile
      portal="legalFinance"
      panelLabel="Legal & Finance"
      loadProfile={getLegalFinanceProfile}
      updateProfile={updateLegalFinanceProfile}
      changePassword={changeLegalFinancePassword}
      uploadPhoto={uploadLegalFinancePhoto}
      removePhoto={removeLegalFinancePhoto}
      mapProfile={mapLegalFinanceProfile}
      resolveImageUrl={resolveLegalFinanceImageUrl}
    />
  );
}
