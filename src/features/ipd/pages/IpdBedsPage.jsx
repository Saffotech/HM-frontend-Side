/**
 * IPD Beds — dense directory with contextual row actions.
 */

import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button, EmptyState, QueryFeedback } from "@/shared/components/common";
import { ROUTES } from "@/shared/constants";
import { toast } from "@/shared/utils/toast";
import IpdPageHeader from "@/features/ipd/components/IpdPageHeader";
import IpdStatusBadge from "@/features/ipd/components/IpdStatusBadge";
import BedAssignModal from "@/features/ipd/components/BedAssignModal";
import BedTransferModal from "@/features/ipd/components/BedTransferModal";
import { useIpdPermissionSet } from "@/features/ipd/hooks/useIpdPermission";
import IpdPermissionButton from "@/features/ipd/components/IpdPermissionButton";
import {
  useIpdBedsQuery,
  useIpdPatientsQuery,
  useIpdWardStatsQuery,
} from "@/features/ipd/hooks/useIpdQuery";
import { useIpdWardOptions } from "@/features/ipd/hooks/useIpdWardOptions";
import { useIpdBedRateLookup } from "@/features/ipd/hooks/useIpdBedRateLookup";
import { IPD_ADMISSION_STATUS } from "@/features/ipd/utils/constants";
import { formatCurrency } from '@/shared/utils/formatCurrency';

const PAGE_SIZE = 25;

export default function IpdBedsPage() {
  const navigate = useNavigate();
  const { canAssignBed, canTransferBed, canAdmit, canDischarge } =
    useIpdPermissionSet();

  const [assignOpen, setAssignOpen] = useState(false);
  const [assignSeed, setAssignSeed] = useState({ ward: "", bedId: "" });
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferAdmissionId, setTransferAdmissionId] = useState("");
  const [transferBed, setTransferBed] = useState(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = searchParams.get("status") ?? "";
  const wardFilter = searchParams.get("ward") ?? "";
  const bedTypeFilter = searchParams.get("bed_type") ?? "";

  const setFilter = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
    setPage(1);
  };

  const wardsQuery = useIpdWardStatsQuery();
  const bedsQuery = useIpdBedsQuery({
    ward: wardFilter || undefined,
    bed_type: bedTypeFilter || undefined,
  });
  const admissionsQuery = useIpdPatientsQuery({
    status: IPD_ADMISSION_STATUS.ADMITTED,
    limit: 100,
  });
  const { wardOptions } = useIpdWardOptions();
  const { getRate, ratesAvailable } = useIpdBedRateLookup();

  const loading = wardsQuery.isLoading || bedsQuery.isLoading;
  const wards = (wardsQuery.data?.wards ?? []).map((ward) => {
    const name = ward.ward;
    const rate = ratesAvailable ? getRate(name) : null;
    return {
      name,
      occupied: ward.occupied ?? 0,
      available: ward.available ?? 0,
      total: (ward.occupied ?? 0) + (ward.available ?? 0),
      rate,
    };
  });

  /** Resolve active admission id from bed occupancy fields. */
  const admissionLookup = useMemo(() => {
    const byBed = new Map();
    const byPatient = new Map();
    const byBedNumber = new Map();
    const byPatientUid = new Map();
    for (const row of admissionsQuery.data?.items ?? []) {
      if (row.bed_id != null) byBed.set(String(row.bed_id), row.id);
      if (row.patient_id != null) byPatient.set(String(row.patient_id), row.id);
      if (row.bed_number) {
        const key = `${String(row.ward_name || "").toLowerCase()}::${String(row.bed_number).toLowerCase()}`;
        byBedNumber.set(key, row.id);
      }
      if (row.patient_uid) {
        byPatientUid.set(String(row.patient_uid).toLowerCase(), row.id);
      }
    }
    return { byBed, byPatient, byBedNumber, byPatientUid };
  }, [admissionsQuery.data]);

  const resolveAdmissionId = (bed) => {
    if (!bed) return null;
    const bedKey = `${String(bed.ward_name || "").toLowerCase()}::${String(bed.bed_number || "").toLowerCase()}`;
    return (
      admissionLookup.byBed.get(String(bed.id)) ??
      (bed.patient_id != null
        ? admissionLookup.byPatient.get(String(bed.patient_id))
        : null) ??
      (bed.bed_number ? admissionLookup.byBedNumber.get(bedKey) : null) ??
      (bed.patient_uid
        ? admissionLookup.byPatientUid.get(String(bed.patient_uid).toLowerCase())
        : null) ??
      null
    );
  };

  const filteredBeds = useMemo(() => {
    let list = bedsQuery.data?.beds ?? [];
    if (statusFilter) {
      list = list.filter((b) => b.status === statusFilter);
    }
    if (bedTypeFilter) {
      list = list.filter((b) => b.bed_type === bedTypeFilter);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((b) => {
        const hay = [b.bed_number, b.ward_name, b.patient_name, b.patient_uid]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
    }
    return list;
  }, [bedsQuery.data, statusFilter, bedTypeFilter, search]);

  const totalFiltered = filteredBeds.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pageBeds = filteredBeds.slice(pageStart, pageStart + PAGE_SIZE);
  const hasFilter = Boolean(statusFilter || wardFilter || bedTypeFilter || search.trim());

  const openAssign = (bed = null) => {
    setAssignSeed({
      ward: bed?.ward_name || "",
      bedId: bed?.id ? String(bed.id) : "",
    });
    setAssignOpen(true);
  };

  const openTransfer = async (bed) => {
    let admissionId = resolveAdmissionId(bed);

    // Admissions list may still be loading / stale — refresh once.
    if (!admissionId) {
      try {
        const fresh = await admissionsQuery.refetch();
        const items = fresh.data?.items ?? [];
        const match = items.find(
          (row) =>
            (bed.id != null && String(row.bed_id) === String(bed.id)) ||
            (bed.patient_id != null &&
              String(row.patient_id) === String(bed.patient_id)) ||
            (bed.bed_number &&
              String(row.bed_number).toLowerCase() ===
                String(bed.bed_number).toLowerCase() &&
              String(row.ward_name || "").toLowerCase() ===
                String(bed.ward_name || "").toLowerCase()) ||
            (bed.patient_uid &&
              String(row.patient_uid).toLowerCase() ===
                String(bed.patient_uid).toLowerCase()),
        );
        admissionId = match?.id ?? null;
      } catch {
        admissionId = null;
      }
    }

    setTransferAdmissionId(admissionId ? String(admissionId) : "");
    setTransferBed(bed || null);
    setTransferOpen(true);
  };

  const openRelease = async (bed) => {
    let admissionId = resolveAdmissionId(bed);
    if (!admissionId) {
      try {
        const fresh = await admissionsQuery.refetch();
        const items = fresh.data?.items ?? [];
        const match = items.find(
          (row) =>
            (bed.id != null && String(row.bed_id) === String(bed.id)) ||
            (bed.patient_id != null &&
              String(row.patient_id) === String(bed.patient_id)) ||
            (bed.patient_uid &&
              String(row.patient_uid).toLowerCase() ===
                String(bed.patient_uid).toLowerCase()) ||
            (bed.bed_number &&
              String(row.bed_number).toLowerCase() ===
                String(bed.bed_number).toLowerCase() &&
              String(row.ward_name || "").toLowerCase() ===
                String(bed.ward_name || "").toLowerCase()),
        );
        admissionId = match?.id ?? null;
      } catch {
        admissionId = null;
      }
    }
    if (!admissionId) {
      toast.error(
        "Could not find an active admission for this bed. Open Discharge from the patient list.",
      );
      return;
    }
    navigate(
      ROUTES.IPD_DISCHARGE_ADMISSION.replace(
        ":admissionId",
        String(admissionId),
      ),
    );
  };

  return (
    <div className="ipd-page ipd-page--compact">
      <IpdPageHeader
        title="Beds"
        middle={
          !loading && wards.length > 0 ? (
            <div className="ipd-beds-summary" aria-label="Ward occupancy">
              {wards.map((ward) => {
                const pct =
                  ward.total > 0
                    ? Math.round((ward.occupied / ward.total) * 100)
                    : 0;
                const active = wardFilter === ward.name;
                return (
                  <button
                    type="button"
                    key={ward.name}
                    className={`ipd-beds-summary__item${
                      active ? " ipd-beds-summary__item--active" : ""
                    }`}
                    onClick={() => setFilter("ward", active ? "" : ward.name)}
                  >
                    <div className="ipd-beds-summary__top">
                      <span className="ipd-beds-summary__name">{ward.name}</span>
                      {ward.rate != null ? (
                        <span className="ipd-beds-summary__rate">
                          {formatCurrency(ward.rate, { empty: '—' })}/day
                        </span>
                      ) : null}
                    </div>
                    <div className="ipd-occ-bar" aria-hidden>
                      <div
                        className="ipd-occ-bar__fill"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="ipd-beds-summary__stats">
                      <span>
                        Occupied: <strong>{ward.occupied}</strong>
                      </span>
                      <span>
                        Available: <strong>{ward.available}</strong>
                      </span>
                      <span>
                        Total: <strong>{ward.total}</strong>
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : null
        }
        actions={
          <IpdPermissionButton
            allowed={canAssignBed || canAdmit}
            type="button"
            className="btn btn--primary btn--md"
            onClick={() => openAssign()}
          >
            Assign Bed
          </IpdPermissionButton>
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
        <div className="ipd-card__head ipd-beds-card__head">
          <h2 className="ipd-card__title">Bed list</h2>
          {!loading ? (
            <span className="ipd-page__subtitle">
              {totalFiltered} bed{totalFiltered === 1 ? "" : "s"}
              {hasFilter ? " matched" : ""}
            </span>
          ) : null}
        </div>

        <div className="ipd-card__body">
          <div className="ipd-beds-filters">
            <div className="ipd-toolbar__field ipd-beds-filters__search">
              <label className="ipd-toolbar__label" htmlFor="ipd-beds-search">
                Search
              </label>
              <input
                id="ipd-beds-search"
                className="ipd-input"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Bed no, ward, or patient…"
              />
            </div>
            <div className="ipd-toolbar__field ipd-toolbar__field--sm">
              <label className="ipd-toolbar__label" htmlFor="ipd-beds-status">
                Status
              </label>
              <select
                id="ipd-beds-status"
                className="ipd-select"
                value={statusFilter}
                onChange={(e) => setFilter("status", e.target.value)}
              >
                <option value="">All</option>
                <option value="available">Available</option>
                <option value="occupied">Occupied</option>
              </select>
            </div>
            <div className="ipd-toolbar__field ipd-toolbar__field--sm">
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
                {wardOptions.map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
            </div>
            <div className="ipd-toolbar__field ipd-toolbar__field--sm">
              <label className="ipd-toolbar__label" htmlFor="ipd-beds-type">
                Bed Type
              </label>
              <select
                id="ipd-beds-type"
                className="ipd-select"
                value={bedTypeFilter}
                onChange={(e) => setFilter("bed_type", e.target.value)}
              >
                <option value="">All types</option>
                <option value="single">Single</option>
                <option value="double">Double</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div style={{ display: "grid", gap: "0.4rem" }}>
              <div className="ipd-skeleton" />
              <div className="ipd-skeleton" />
              <div className="ipd-skeleton" />
            </div>
          ) : totalFiltered === 0 ? (
            <EmptyState
              title={
                hasFilter ? "No beds match these filters" : "No beds to show"
              }
              description={
                hasFilter
                  ? "Clear search or change ward / status / bed type."
                  : "Add beds from hospital bed inventory to see them here."
              }
            />
          ) : (
            <>
              <div className="ipd-table-wrap">
                <table className="ipd-table ipd-table--beds">
                  <thead>
                    <tr>
                      <th>Ward</th>
                      <th>Bed</th>
                      <th>Type</th>
                      <th>Rate / day</th>
                      <th>Status</th>
                      <th>Patient</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageBeds.map((bed) => {
                      const occupied = bed.status === "occupied";
                      const rate = ratesAvailable ? getRate(bed) : null;
                      return (
                        <tr
                          key={bed.id}
                          className={
                            occupied
                              ? "ipd-bed-row--occupied"
                              : "ipd-bed-row--available"
                          }
                        >
                          <td>{bed.ward_name || "—"}</td>
                          <td>
                            <strong>{bed.bed_number || bed.id}</strong>
                          </td>
                          <td>
                            {bed.bed_type
                              ? bed.bed_type.charAt(0).toUpperCase() +
                                bed.bed_type.slice(1)
                              : "—"}
                          </td>
                          <td>
                            {formatCurrency(rate, { empty: '—' })}
                          </td>
                          <td>
                            <IpdStatusBadge status={bed.status} />
                          </td>
                          <td>
                            {occupied ? (
                              <>
                                {bed.patient_name || "—"}
                                {bed.patient_uid ? (
                                  <span className="ipd-page__subtitle">
                                    {" "}
                                    · {bed.patient_uid}
                                  </span>
                                ) : null}
                              </>
                            ) : (
                              <span className="ipd-page__subtitle">Free</span>
                            )}
                          </td>
                          <td>
                            <div className="ipd-table__actions">
                              {occupied ? (
                                <>
                                  <IpdPermissionButton
                                    allowed={canTransferBed}
                                    deniedMessage="You do not have permission to transfer beds"
                                    type="button"
                                    className="btn btn--sm ipd-action-btn ipd-action-btn--transfer"
                                    onClick={() => openTransfer(bed)}
                                  >
                                    Transfer
                                  </IpdPermissionButton>
                                  <IpdPermissionButton
                                    allowed={canDischarge}
                                    deniedMessage="You do not have permission to release / discharge"
                                    type="button"
                                    className="btn btn--sm ipd-action-btn ipd-action-btn--release"
                                    onClick={() => openRelease(bed)}
                                  >
                                    Release
                                  </IpdPermissionButton>
                                </>
                              ) : (
                                <IpdPermissionButton
                                  allowed={canAssignBed || canAdmit}
                                  deniedMessage="You do not have permission to assign beds"
                                  type="button"
                                  className="btn btn--sm ipd-action-btn ipd-action-btn--assign"
                                  onClick={() => openAssign(bed)}
                                >
                                  Assign Bed
                                </IpdPermissionButton>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="ipd-beds-pager">
                <span className="ipd-page__subtitle">
                  Showing {pageStart + 1}–
                  {Math.min(pageStart + PAGE_SIZE, totalFiltered)} of{" "}
                  {totalFiltered}
                </span>
                <div className="ipd-beds-pager__controls">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={safePage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <span className="ipd-page__subtitle">
                    Page {safePage} / {totalPages}
                  </span>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={safePage >= totalPages}
                    onClick={() =>
                      setPage((p) => Math.min(totalPages, p + 1))
                    }
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <BedAssignModal
        open={assignOpen}
        onClose={() => {
          setAssignOpen(false);
          setAssignSeed({ ward: "", bedId: "" });
        }}
        initialWard={assignSeed.ward}
        initialBedId={assignSeed.bedId}
      />
      <BedTransferModal
        open={transferOpen}
        onClose={() => {
          setTransferOpen(false);
          setTransferAdmissionId("");
          setTransferBed(null);
        }}
        initialAdmissionId={transferAdmissionId}
        initialBed={transferBed}
        lockAdmission={Boolean(transferAdmissionId || transferBed?.id)}
      />
    </div>
  );
}
