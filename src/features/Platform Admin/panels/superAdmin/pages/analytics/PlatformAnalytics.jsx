import LocationChart from "../../components/charts/LocationChart";
import PlanChart from "../../components/charts/PlanChart";
import RevenueChart from "../../components/charts/RevenueChart";
import RevenueCompareChart from "../../components/charts/RevenueCompareChart";
import TenantGrowthChart from "../../components/charts/TenantGrowthChart";
import { locationBars, planSlices, registrationMonths, statusRows } from "../../sessionHospitals";
import { useRegisteredHospitals } from "../../useRegisteredHospitals";
import "./PlatformAnalytics.css";

export default function PlatformAnalytics() {
  const { hospitals } = useRegisteredHospitals();
  const statuses = statusRows(hospitals);

  return (
    <section>
      <p className="panel-copy">
        Growth, plans, and location use hospitals registered on the server. Revenue charts stay empty until a billing API is connected.
      </p>
      <div className="analytics-grid">
        <TenantGrowthChart data={registrationMonths(hospitals)} />
        <PlanChart data={planSlices(hospitals)} />
        <RevenueCompareChart data={[]} />
        <section className="card card-pad chart-card" aria-label="Hospital status">
          <h2>Hospital status</h2>
          <p className="panel-copy">Active, trial, and suspended hospitals on the server.</p>
          <ul className="status-list">
            {statuses.map((row) => (
              <li key={row.name}>
                <span>{row.name}</span>
                <strong>{hospitals.length === 0 ? "—" : row.value}</strong>
              </li>
            ))}
          </ul>
        </section>
        <LocationChart data={locationBars(hospitals)} />
        <RevenueChart data={[]} />
      </div>
    </section>
  );
}
