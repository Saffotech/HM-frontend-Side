import { GrowthPanel, InvoicePanel, LeadsPanel, LocationPanel, PlanPanel, StatusPanel } from "./AnalyticsPanels";
import Button from "../../../../shared/components/Button";
import { revenueSnapshot } from "../../../../shared/api/platformRevenue";
import { useCrmAnalytics } from "../../../../shared/hooks/useCrmAnalytics";
import { usePlatformRevenue } from "../../../../shared/hooks/usePlatformRevenue";
import { locationBars, planSlices, registrationMonths, statusRows } from "../../sessionHospitals";
import { useRegisteredHospitals } from "../../useRegisteredHospitals";
import "./PlatformAnalytics.css";

export default function PlatformAnalytics() {
  const { hospitals, loading, error, reload } = useRegisteredHospitals();
  const { revenue, loading: revenueLoading, error: revenueError, reload: reloadRevenue } = usePlatformRevenue();
  const { statuses, loading: leadsLoading, error: leadsError, reload: reloadLeads } = useCrmAnalytics();
  const hospitalStatuses = statusRows(hospitals);
  const hospitalsReady = !loading && !error;

  return (
    <div className="pa">
      {loading && <p className="pa-banner">Loading hospitals.</p>}
      {error && (
        <div className="pa-alert" role="alert">
          <p>{error}</p>
          <Button variant="secondary" onClick={reload}>Try again</Button>
        </div>
      )}
      {hospitalsReady && hospitals.length === 0 && (
        <p className="pa-banner">No hospitals are registered yet.</p>
      )}

      {hospitalsReady && (
        <>
          <div className="pa-split">
            <GrowthPanel data={registrationMonths(hospitals)} />
            <PlanPanel data={planSlices(hospitals)} />
          </div>
          <StatusPanel rows={hospitalStatuses} />
          <LocationPanel data={locationBars(hospitals)} />
        </>
      )}

      <LeadsPanel statuses={statuses} loading={leadsLoading} error={leadsError} onRetry={reloadLeads} />
      <InvoicePanel
        data={revenueLoading || revenueError ? [] : revenueSnapshot(revenue)}
        loading={revenueLoading}
        error={revenueError}
        onRetry={reloadRevenue}
      />
    </div>
  );
}
