import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../../../shared/components/Button";
import DataTable from "../../../../shared/components/DataTable";
import SearchBar from "../../../../shared/components/SearchBar";
import { useRegisteredHospitals } from "../../useRegisteredHospitals";
import { PLATFORM_BASE, platformPath } from "../../../../shared/paths";
import { includesQuery } from "../../../../shared/utils/table";
import "./Hospitals.css";

export default function Hospitals() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const { hospitals, loading, error } = useRegisteredHospitals();

  const rows = useMemo(
    () => hospitals.filter((hospital) => includesQuery(
      [hospital.name, hospital.tenant_id, hospital.code, hospital.plan],
      search,
    )),
    [hospitals, search],
  );

  const columns = [
    { key: "name", label: "Hospital", render: (row) => row.name || "—" },
    { key: "code", label: "Code", render: (row) => row.code || "—" },
    { key: "plan", label: "Plan", render: (row) => `${row.plan || "—"} · ${row.billing_cycle || "—"}` },
    { key: "status", label: "Status", render: (row) => row.subscription_status || row.tenant_status || "—" },
    {
      key: "activation",
      label: "Activation",
      render: (row) => (typeof row.is_active === "boolean" ? (row.is_active ? "Active" : "Suspended") : "—"),
    },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <Button variant="outline" size="sm" onClick={() => navigate(`${PLATFORM_BASE}/hospitals/${row.tenant_id}`)}>
          View
        </Button>
      ),
    },
  ];

  return (
    <section className="hospitals-page">
      <div className="hospitals-list-bar">
        <SearchBar value={search} onChange={setSearch} placeholder="Search name or code" />
        <Button onClick={() => navigate(platformPath("/hospitals/register"))}>Register hospital</Button>
      </div>
      {error && <p className="hospitals-api-note" role="alert">{error}</p>}
      <DataTable
        rows={rows}
        columns={columns}
        emptyTitle={loading ? "Loading hospitals" : error ? "Hospitals could not be loaded" : search.trim() ? "No hospitals match your search." : "No hospitals are registered yet"}
        emptyMessage={loading ? "Fetching registered hospitals." : error ? "This is not an empty directory." : search.trim() ? "Try another name or code." : "Register a hospital to add it here."}
      />
    </section>
  );
}
