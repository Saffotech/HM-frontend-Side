import LocationChart from "../../components/charts/LocationChart";
import PlanChart from "../../components/charts/PlanChart";
import RevenueChart from "../../components/charts/RevenueChart";
import TenantGrowthChart from "../../components/charts/TenantGrowthChart";
import Button from "../../../../shared/components/Button";
import { CRM_ANALYTICS_STATUSES } from "../../../../shared/api/platformCrmAnalytics";
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
    <section>
      {loading && <p className="panel-copy">Loading hospitals.</p>}
      {error && (
        <div role="alert">
          <p className="panel-copy">{error}</p>
          <Button variant="secondary" onClick={reload}>Try again</Button>
        </div>
      )}
      {hospitalsReady && hospitals.length === 0 && (
        <p className="panel-copy">No hospitals are registered yet.</p>
      )}
      <div className="analytics-grid">
        {hospitalsReady && (
          <>
            <TenantGrowthChart data={registrationMonths(hospitals)} />
            <PlanChart data={planSlices(hospitals)} />
            <section className="card card-pad chart-card" aria-label="Hospital status">
              <h2>Hospital status</h2>
              <p className="panel-copy">Active, trial, and suspended hospitals on the server.</p>
              <ul className="status-list">
                {hospitalStatuses.map((row) => (
                  <li key={row.name}>
                    <span>{row.name}</span>
                    <strong>{row.value}</strong>
                  </li>
                ))}
              </ul>
            </section>
            <LocationChart data={locationBars(hospitals)} />
          </>
        )}
        <section className="card card-pad chart-card" aria-label="Company-wide leads">
          <h2>Company-wide leads</h2>
          <p className="panel-copy">Lead counts for the whole company. This does not replace the CRM lead list.</p>
          {leadsLoading && <p className="panel-copy">Loading lead counts.</p>}
          {leadsError && (
            <div role="alert">
              <p className="panel-copy">{leadsError}</p>
              <Button variant="secondary" onClick={reloadLeads}>Try again</Button>
            </div>
          )}
          {statuses && (
            <ul className="status-list">
              {CRM_ANALYTICS_STATUSES.map((status) => (
                <li key={status}>
                  <span>{status}</span>
                  <strong>{statuses[status]}</strong>
                </li>
              ))}
              <li>
                <span>Total</span>
                <strong>{statuses.total}</strong>
              </li>
            </ul>
          )}
        </section>
        {revenueError && (
          <div role="alert">
            <p className="panel-copy">{revenueError}</p>
            <Button variant="secondary" onClick={reloadRevenue}>Try again</Button>
          </div>
        )}
        <RevenueChart data={revenueLoading || revenueError ? [] : revenueSnapshot(revenue)} />
      </div>
    </section>
  );
}
