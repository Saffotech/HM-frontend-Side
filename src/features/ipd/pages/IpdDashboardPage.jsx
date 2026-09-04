/**
 * IPD Dashboard — live `/ipd/dashboard`.
 */

import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BedDouble,
  Bed,
  UserPlus,
  LogOut,
  Receipt,
  PlusCircle,
} from "lucide-react";
import { Button, EmptyState, QueryFeedback } from "@/shared/components/common";
import { ROUTES } from "@/shared/constants";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import IpdActionCard from "@/features/ipd/components/IpdActionCard";
import IpdPageHeader from "@/features/ipd/components/IpdPageHeader";
import IpdStatCard from "@/features/ipd/components/IpdStatCard";
import IpdStatusBadge from "@/features/ipd/components/IpdStatusBadge";
import { useIpdDashboardQuery } from "@/features/ipd/hooks/useIpdQuery";
import { useIpdPermissionSet } from "@/features/ipd/hooks/useIpdPermission";
import { formatIpdDateTime } from "@/features/ipd/utils/ipdFormat";
import { resolveIpdPatientOpenPath } from "@/features/ipd/utils/ipdPaymentTypes";

/** Matches backend `/ipd/dashboard` recent_admissions `.limit(8)`. */
const RECENT_PAGE_SIZE = 8;

const todayIso = () => new Date().toISOString().slice(0, 10);

function isInteractiveTableTarget(target) {
  return Boolean(
    target?.closest?.("a, button, input, select, textarea, label"),
  );
}

/**
 * Each metric drills into the list it counts, pre-filtered to match the number
 * the backend returned (see `ipd_service.get_dashboard`).
 */
function buildStats(permissions) {
  const { canViewBeds, canListPatients, canViewBilling } = permissions;
  return [
    {
      key: "occupied_beds",
      label: "Occupied Beds",
      icon: BedDouble,
      tone: "ipd-stat-card--rose",
      to: canViewBeds ? `${ROUTES.IPD_BEDS}?status=occupied` : null,
    },
    {
      key: "available_beds",
      label: "Available Beds",
      icon: Bed,
      tone: "ipd-stat-card--green",
      to: canViewBeds ? `${ROUTES.IPD_BEDS}?status=available` : null,
    },
    {
      key: "admissions_today",
      label: "Admissions Today",
      icon: UserPlus,
      tone: "",
      to: canListPatients
        ? `${ROUTES.IPD_PATIENTS}?admissionDate=${todayIso()}`
        : null,
    },
    {
      key: "pending_discharges",
      label: "Pending Discharges",
      icon: LogOut,
      tone: "ipd-stat-card--amber",
      to: canListPatients ? `${ROUTES.IPD_PATIENTS}?status=admitted` : null,
    },
    {
      // Backend `running_bills` counts pending/partial IpdBill rows.
      // Bills page lists every admitted stay — reuse dashboard admitted count
      // (`pending_discharges`) so the card matches that list (frontend-only).
      key: "running_bills",
      valueKey: "pending_discharges",
      label: "Running Bills",
      icon: Receipt,
      tone: "ipd-stat-card--teal",
      to: canViewBilling ? ROUTES.IPD_BILLING : null,
    },
  ];
}

export default function IpdDashboardPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError, error, refetch } = useIpdDashboardQuery();
  const permissions = useIpdPermissionSet();
  const { canAdmit } = permissions;
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search, 300);
  const stats = useMemo(() => buildStats(permissions), [permissions]);
  const recentAdmissions = useMemo(() => {
    const rows = (data?.recent_admissions ?? []).filter(
      (row) => row.status === "admitted",
    );
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return rows;

    return rows.filter((row) => {
      const hay = [
        row.patient_name,
        row.patient_uid,
        row.admission_no,
        row.id,
        row.ward_name,
        row.bed_number,
        row.doctor_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [data?.recent_admissions, debouncedSearch]);

  const totalFiltered = recentAdmissions.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / RECENT_PAGE_SIZE) || 1);
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * RECENT_PAGE_SIZE;
  const pageRows = recentAdmissions.slice(pageStart, pageStart + RECENT_PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  return (
    <div className="ipd-page">
      <IpdPageHeader title="IPD Dashboard" />

      {isError ? (
        <div className="ipd-card">
          <div className="ipd-card__body">
            <QueryFeedback isError error={error} onRetry={refetch} />
          </div>
        </div>
      ) : null}

      <div className="ipd-stat-grid">
        {canAdmit ? (
          <IpdActionCard
            label="Admit Patient"
            description="Start admission"
            to={ROUTES.IPD_ADMIT}
            icon={PlusCircle}
            tone="ipd-stat-card--violet"
          />
        ) : null}
        {stats.map((card) => (
          <IpdStatCard
            key={card.key}
            label={card.label}
            value={data?.[card.valueKey ?? card.key] ?? "—"}
            icon={card.icon}
            tone={card.tone}
            to={card.to}
            loading={isLoading}
          />
        ))}
      </div>

      <div className="ipd-card">
        <div className="ipd-card__head ipd-dash-recent__head">
          <div className="ipd-dash-recent__left">
            <h2 className="ipd-card__title">Recent Admissions</h2>
            <div className="ipd-toolbar__field ipd-dash-recent__search">
              <input
                id="ipd-dash-recent-search"
                className="ipd-input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search patient…"
                aria-label="Search recent admissions"
              />
            </div>
          </div>
          <Link to={ROUTES.IPD_PATIENTS} className="ipd-page__subtitle">
            View all
          </Link>
        </div>
        <div className="ipd-card__body ipd-dash-recent__body">
          {isLoading ? (
            <div style={{ display: "grid", gap: "0.5rem" }}>
              <div className="ipd-skeleton" />
              <div className="ipd-skeleton" />
              <div className="ipd-skeleton" />
            </div>
          ) : (
            <>
              <div className="ipd-table-wrap">
                <table className="ipd-table ipd-table--dense ipd-table--dash-recent">
                  <thead>
                    <tr>
                      <th>Admission</th>
                      <th>Patient</th>
                      <th>Ward / Bed</th>
                      <th>Doctor</th>
                      <th>Status</th>
                      <th>Admitted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {totalFiltered === 0 ? (
                      <tr>
                        <td colSpan={6}>
                          <EmptyState
                            title={
                              debouncedSearch.trim()
                                ? "No matching admissions"
                                : "No recent admissions"
                            }
                            description={
                              debouncedSearch.trim()
                                ? "Try a different patient name, ID, or admission."
                                : "New admissions will appear here as patients are admitted."
                            }
                          />
                        </td>
                      </tr>
                    ) : (
                      pageRows.map((row) => {
                        const profilePath = resolveIpdPatientOpenPath(row);
                        return (
                        <tr
                          key={row.id}
                          className="ipd-table__row--clickable"
                          tabIndex={profilePath ? 0 : undefined}
                          onClick={(e) => {
                            if (isInteractiveTableTarget(e.target)) return;
                            if (profilePath) navigate(profilePath);
                          }}
                          onKeyDown={(e) => {
                            if (e.key !== "Enter") return;
                            if (isInteractiveTableTarget(e.target)) return;
                            e.currentTarget.click();
                          }}
                        >
                          <td>
                            {profilePath ? (
                              <Link to={profilePath}>
                                {row.admission_no || `#${row.id}`}
                              </Link>
                            ) : (
                              row.admission_no || `#${row.id}`
                            )}
                          </td>
                          <td>
                            <div className="ipd-dash-recent__patient">
                              <strong>{row.patient_name || "—"}</strong>
                              {row.patient_uid ? (
                                <span className="ipd-page__subtitle">
                                  {row.patient_uid}
                                </span>
                              ) : null}
                            </div>
                          </td>
                          <td>
                            {row.ward_name || "—"} / {row.bed_number || "—"}
                          </td>
                          <td>
                            {row.doctor_name ||
                              (row.status === "admitted" && profilePath ? (
                                <Link to={profilePath}>Assign doctor</Link>
                              ) : (
                                "—"
                              ))}
                          </td>
                          <td>
                            <IpdStatusBadge status={row.status} />
                          </td>
                          <td>{formatIpdDateTime(row.admitted_at)}</td>
                        </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {totalFiltered > 0 ? (
                <div className="ipd-beds-pager ipd-dash-recent__pager">
                  <span className="ipd-page__subtitle">
                    Showing {pageStart + 1}–
                    {Math.min(pageStart + RECENT_PAGE_SIZE, totalFiltered)} of{" "}
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
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
