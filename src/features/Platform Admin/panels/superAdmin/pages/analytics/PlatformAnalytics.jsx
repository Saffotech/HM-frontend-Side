import LocationChart from "../../components/charts/LocationChart";
import PlanChart from "../../components/charts/PlanChart";
import RevenueChart from "../../components/charts/RevenueChart";
import RevenueCompareChart from "../../components/charts/RevenueCompareChart";
import TenantGrowthChart from "../../components/charts/TenantGrowthChart";
import Button from "../../../../shared/components/Button";
import { locationBars, planSlices, registrationMonths, statusRows } from "../../sessionHospitals";
import { useRegisteredHospitals } from "../../useRegisteredHospitals";
import "./PlatformAnalytics.css";

export default function PlatformAnalytics() {
  const { hospitals, loading, error, reload } = useRegisteredHospitals();
  const statuses = statusRows(hospitals);
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
                {statuses.map((row) => (
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
        <RevenueCompareChart data={[]} />
        <RevenueChart data={[]} />
      </div>
    </section>
  );
}
