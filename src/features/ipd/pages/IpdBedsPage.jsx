/**
 * IPD Beds overview — live `/ipd/beds` + `/ipd/beds/wards`.
 */

import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button, EmptyState, QueryFeedback } from "@/shared/components/common";
import { ROUTES, WARDS } from "@/shared/constants";
import IpdPageHeader from "@/features/ipd/components/IpdPageHeader";
import IpdStatusBadge from "@/features/ipd/components/IpdStatusBadge";
import BedAssignModal from "@/features/ipd/components/BedAssignModal";
import BedTransferModal from "@/features/ipd/components/BedTransferModal";
import { useIpdPermissionSet } from "@/features/ipd/hooks/useIpdPermission";
import IpdPermissionButton from "@/features/ipd/components/IpdPermissionButton";
import {
  useIpdBedsQuery,
  useIpdWardStatsQuery,
} from "@/features/ipd/hooks/useIpdQuery";

export default function IpdBedsPage() {
  const navigate = useNavigate();
  const { canAssignBed, canTransferBed, canAdmit } = useIpdPermissionSet();
  const [assignOpen, setAssignOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);

  // Filters live in the URL so dashboard drill-downs land on a filtered view.
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = searchParams.get("status") ?? "";
  const wardFilter = searchParams.get("ward") ?? "";

  const setFilter = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  };

  const wardsQuery = useIpdWardStatsQuery();
  const bedsQuery = useIpdBedsQuery({
    status: statusFilter || undefined,
    ward: wardFilter || undefined,
  });

  const loading = wardsQuery.isLoading || bedsQuery.isLoading;
  const wards = (wardsQuery.data?.wards ?? []).map((ward) => ({
    name: ward.ward,
    occupied: ward.occupied ?? 0,
    available: ward.available ?? 0,
    total: (ward.occupied ?? 0) + (ward.available ?? 0),
  }));
  const beds = bedsQuery.data?.beds ?? [];
  // Bed stats follow the active filter, so headline totals come from ward stats.
  const totals = wards.reduce(
    (acc, ward) => ({
      occupied: acc.occupied + ward.occupied,
      available: acc.available + ward.available,
      total: acc.total + ward.total,
    }),
    { occupied: 0, available: 0, total: 0 },
  );
  const hasFilter = Boolean(statusFilter || wardFilter);

  return (
    <div className="ipd-page">
      <IpdPageHeader
        title="Beds"
        subtitle={
          totals.total
            ? `${totals.occupied} occupied · ${totals.available} available · ${totals.total} total`
            : "Ward occupancy and bed directory"
        }
        actions={
          <>
            <IpdPermissionButton
              allowed={canAssignBed || canAdmit}
              type="button"
              className="btn btn--primary btn--md"
              onClick={() => setAssignOpen(true)}
            >
              Assign bed
            </IpdPermissionButton>
            <IpdPermissionButton
              allowed={canTransferBed}
              type="button"
              className="btn btn--secondary btn--md"
              onClick={() => setTransferOpen(true)}
            >
              Transfer
            </IpdPermissionButton>
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate(ROUTES.IPD_BED_TRANSFER)}
            >
              Transfer page
            </Button>
          </>
        }
      />

      {(wardsQuery.isError || bedsQuery.isError) && (
        <div className="ipd-card">
          <div className="ipd-card__body">
            <QueryFeedback
              isError
              error={wardsQuery.error || bedsQuery.error}
              onRetry={() => {
                wardsQuery.refetch();
                bedsQuery.refetch();
              }}
            />
          </div>
        </div>
      )}

      <div className="ipd-card">
        <div className="ipd-card__head">
          <h2 className="ipd-card__title">Wards</h2>
        </div>
        <div className="ipd-card__body">
          {loading ? (
            <div className="ipd-ward-grid">
              <div className="ipd-skeleton" style={{ height: "5rem" }} />
              <div className="ipd-skeleton" style={{ height: "5rem" }} />
            </div>
          ) : wards.length === 0 ? (
            <EmptyState
              title="No ward data"
              description="Ward occupancy will appear once beds are configured in inventory."
            />
          ) : (
            <div className="ipd-ward-grid">
              {wards.map((ward) => (
                <div key={ward.name} className="ipd-ward-card">
                  <p className="ipd-ward-card__name">{ward.name}</p>
                  <p className="ipd-ward-card__meta">
                    Occupied {ward.occupied} · Available {ward.available} ·
                    Total {ward.total}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="ipd-card">
        <div className="ipd-card__head">
          <h2 className="ipd-card__title">Bed directory</h2>
        </div>
        <div className="ipd-card__body">
          <div className="ipd-toolbar" style={{ marginBottom: "1rem" }}>
            <div className="ipd-toolbar__field">
              <label className="ipd-toolbar__label" htmlFor="ipd-beds-status">
                Status
              </label>
              <select
                id="ipd-beds-status"
                className="ipd-select"
                value={statusFilter}
                onChange={(e) => setFilter("status", e.target.value)}
              >
                <option value="">All beds</option>
                <option value="available">Available</option>
                <option value="occupied">Occupied</option>
              </select>
            </div>
            <div className="ipd-toolbar__field">
              <label className="ipd-toolbar__label" htmlFor="ipd-beds-ward">
                Ward
              </label>
              <select
                id="ipd-beds-ward"
                className="ipd-select"
                value={wardFilter}
                onChange={(e) => setFilter("ward", e.target.value)}
              >
                <option value="">All wards</option>
                {(WARDS ?? []).map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {loading ? (
            <div className="ipd-bed-grid">
              <div className="ipd-skeleton" style={{ height: "4.5rem" }} />
              <div className="ipd-skeleton" style={{ height: "4.5rem" }} />
            </div>
          ) : beds.length === 0 ? (
            <EmptyState
              title={
                hasFilter ? "No beds match these filters" : "No beds to show"
              }
              description={
                hasFilter
                  ? "Try a different status or ward."
                  : "Add beds from hospital bed inventory to see them here."
              }
            />
          ) : (
            <div className="ipd-bed-grid">
              {beds.map((bed) => (
                <div
                  key={bed.id}
                  className={`ipd-bed-card ipd-bed-card--${
                    bed.status === "occupied" ? "occupied" : "available"
                  }`}
                >
                  <div className="ipd-bed-card__no">
                    {bed.ward_name ? `${bed.ward_name} · ` : ""}
                    {bed.bed_number || bed.id}
                  </div>
                  <IpdStatusBadge status={bed.status} />
                  <div className="ipd-bed-card__patient">
                    {bed.patient_name || "Unassigned"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <BedAssignModal open={assignOpen} onClose={() => setAssignOpen(false)} />
      <BedTransferModal
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
      />
    </div>
  );
}
