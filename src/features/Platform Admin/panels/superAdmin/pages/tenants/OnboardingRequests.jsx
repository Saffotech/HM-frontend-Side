import UnavailableFeature from "../../../../shared/components/UnavailableFeature";
import "./OnboardingRequests.css";

export default function OnboardingRequests() {
  return (
    <section className="onb-page">
      <UnavailableFeature
        title="Company-wide CRM performance is unavailable"
        message="GET /crm/leads returns only the signed-in user's assigned leads and unclaimed New enquiries. There is no list-all-leads or CRM analytics API for Platform Admin. Use the CRM portal for live lead work."
      />
    </section>
  );
}
