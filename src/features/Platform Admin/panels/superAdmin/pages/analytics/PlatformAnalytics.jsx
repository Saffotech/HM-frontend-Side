import { useMemo, useState } from "react";
import LocationChart from "../../components/charts/LocationChart";
import PlanChart from "../../components/charts/PlanChart";
import RevenueChart from "../../components/charts/RevenueChart";
import RevenueCompareChart from "../../components/charts/RevenueCompareChart";
import TenantGrowthChart from "../../components/charts/TenantGrowthChart";
import Select from "../../../../shared/components/Select";
import PageHeader from "../../layout/PageHeader";
import { usePlatform } from "../../../../shared/context/PlatformContext";
import { inRange, registrationSeries, revenueComparison, revenueSeries } from "../../utils/metrics";
import "./PlatformAnalytics.css";

export default function PlatformAnalytics() {
  const { hospitals, invoices } = usePlatform();
  const [preset, setPreset] = useState("12m");

  const view = useMemo(() => {
    const registered = hospitals.filter((hospital) => inRange(hospital.registeredAt, preset));
    const plans = [...new Set(registered.map((hospital) => hospital.plan))];
    const locations = Object.entries(registered.reduce((groups, hospital) => {
      groups[hospital.state] = (groups[hospital.state] || 0) + 1;
      return groups;
    }, {})).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    const active = registered.filter((hospital) => hospital.status === "Active").length;
    return {
      registered,
      growth: registrationSeries(registered, preset),
      revenue: revenueSeries(invoices, preset),
      revenueCompare: revenueComparison(invoices, preset),
      activity: [
        { name: "Active", value: active },
        { name: "Inactive", value: registered.length - active },
      ],
      plans: plans.map((name) => ({ name, value: registered.filter((hospital) => hospital.plan === name).length })),
      locations,
    };
  }, [hospitals, invoices, preset]);

  return (
    <section>
      <PageHeader
        actions={(
          <Select label="Period" value={preset} onChange={(event) => setPreset(event.target.value)}>
            <option value="3m">Last 3 months</option>
            <option value="6m">Last 6 months</option>
            <option value="12m">Last 12 months</option>
            <option value="ytd">This year</option>
          </Select>
        )}
      />
      <div className="analytics-grid">
        <TenantGrowthChart data={view.growth} title="Tenant registration trend" />
        <PlanChart
          title="Active versus inactive"
          description="Green is active hospitals. Blue is inactive hospitals, including suspended and closed."
          data={view.activity}
        />
        <RevenueCompareChart data={view.revenueCompare} />
        <PlanChart title="Plan adoption" data={view.plans} />
        <LocationChart data={view.locations} />
        <RevenueChart data={view.revenue} />
      </div>
    </section>
  );
}
