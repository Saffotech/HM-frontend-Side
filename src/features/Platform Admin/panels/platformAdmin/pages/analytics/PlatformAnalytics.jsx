import { useCallback, useEffect, useState } from "react";
import { GrowthPanel, InvoicePanel, LocationPanel, PlanPanel, StatusPanel } from "./AnalyticsPanels";
import Button from "../../../../shared/components/Button";
import { getPlatformRevenue } from "../../../../shared/api/platformRevenue";
import { platformCallMessage, shouldEndPlatformSession } from "../../../../shared/api/platformErrors";
import { usePlatform } from "../../../../shared/context/PlatformContext";
import { locationBars, planSlices, statusRows } from "../../sessionHospitals";
import { useRegisteredHospitals } from "../../useRegisteredHospitals";
import "./PlatformAnalytics.css";

const REVENUE_FIELDS = [
  "collected_amount",
  "collected_count",
  "pending_amount",
  "pending_count",
  "overdue_amount",
  "overdue_count",
  "outstanding_amount",
  "failed_count",
  "invoice_count",
];

// Validate raw results from the same endpoints instead of usePlatformRevenue/useCrmAnalytics:
// their shared mappers default absent numeric fields to zero, which would hide an incomplete response.

function isNonNegativeNumber(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function parseRevenue(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  if (!REVENUE_FIELDS.every((field) => Object.hasOwn(body, field) && isNonNegativeNumber(body[field]))) return null;
  return {
    collectedAmount: body.collected_amount,
    collectedCount: body.collected_count,
    pendingAmount: body.pending_amount,
    pendingCount: body.pending_count,
    overdueAmount: body.overdue_amount,
    overdueCount: body.overdue_count,
    outstandingAmount: body.outstanding_amount,
    failedCount: body.failed_count,
    invoiceCount: body.invoice_count,
  };
}

function useAnalyticsResource(load, parse, label) {
  const { signOutPortal } = usePlatform();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const reload = useCallback(() => setAttempt((current) => current + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    setData(null);
    load()
      .then((body) => {
        if (cancelled) return;
        const parsed = parse(body);
        if (!parsed) {
          setError(`${label} response was incomplete or not recognized.`);
          return;
        }
        setData(parsed);
      })
      .catch((requestError) => {
        if (cancelled) return;
        setError(platformCallMessage(requestError));
        if (shouldEndPlatformSession(requestError)) signOutPortal("platform");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [attempt, label, load, parse, signOutPortal]);

  return { data, loading, error, reload };
}

function tenantGrowthData(hospitals) {
  const counts = new Map();
  hospitals.forEach((hospital) => {
    const value = hospital.created_at || hospital.rememberedAt;
    const date = value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) return;
    const key = date.getFullYear() * 12 + date.getMonth();
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  if (counts.size === 0) return [];

  const keys = [...counts.keys()].sort((left, right) => left - right);
  const rows = [];
  for (let key = keys[0]; key <= keys[keys.length - 1]; key += 1) {
    const year = Math.floor(key / 12);
    const month = key % 12;
    const date = new Date(year, month, 1);
    rows.push({
      label: date.toLocaleString("en-IN", { month: "short", year: "2-digit" }),
      tenants: counts.get(key) || 0,
    });
  }
  return rows;
}

export default function PlatformAnalytics() {
  const { hospitals, loading, error, reload } = useRegisteredHospitals();
  const revenueRequest = useAnalyticsResource(getPlatformRevenue, parseRevenue, "Revenue");
  const hospitalStatuses = statusRows(hospitals);
  const hospitalsReady = !loading && !error;

  return (
    <div className="pa">
      <InvoicePanel
        revenue={revenueRequest.data}
        loading={revenueRequest.loading}
        error={revenueRequest.error}
        onRetry={revenueRequest.reload}
      />

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
            <GrowthPanel data={tenantGrowthData(hospitals)} />
            <PlanPanel data={planSlices(hospitals)} />
          </div>
          <StatusPanel rows={hospitalStatuses} />
          <LocationPanel data={locationBars(hospitals)} />
        </>
      )}
    </div>
  );
}
