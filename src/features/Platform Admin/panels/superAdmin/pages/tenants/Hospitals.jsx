import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Button from "../../../../shared/components/Button";
import ConfirmDialog from "../../../../shared/components/ConfirmDialog";
import DataTable from "../../../../shared/components/DataTable";
import Input from "../../../../shared/components/Input";
import Modal from "../../../../shared/components/Modal";
import SearchBar from "../../../../shared/components/SearchBar";
import Select from "../../../../shared/components/Select";
import Pagination from "../../../../shared/components/Pagination";
import PageHeader from "../../layout/PageHeader";
import { billingCycles } from "../../../../shared/data/plansData";
import { usePlatform } from "../../../../shared/context/PlatformContext";
import { PLATFORM_BASE, platformPath } from "../../../../shared/paths";
import { usePagination } from "../../../../shared/hooks/usePagination";
import { useToast } from "../../../../shared/hooks/useToast";
import { formatDate } from "../../../../shared/utils/formatDate";
import { priceFor } from "../../../../shared/utils/hospitals";
import { includesQuery, sortRows } from "../../../../shared/utils/table";
import "./Hospitals.css";

const emptyFilters = { status: "All", plan: "All", from: "", to: "" };

function StatusChip({ status }) {
  const tone = status === "Active" ? "active" : status === "Suspended" ? "suspended" : "closed";
  return <span className={`status-chip status-${tone}`}>{status}</span>;
}

export default function Hospitals() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { hospitals, plans, updateHospital, setHospitalStatus } = usePlatform();
  const { push } = useToast();
  const query = params.get("q") || "";
  const [search, setSearch] = useState(query);
  const [urlQuery, setUrlQuery] = useState(query);
  const [filters, setFilters] = useState(emptyFilters);
  const [sortKey, setSortKey] = useState("name");
  const [sortDirection, setSortDirection] = useState("asc");
  const [selected, setSelected] = useState([]);
  const [confirm, setConfirm] = useState(null);
  const [editing, setEditing] = useState(null);
  if (query !== urlQuery) {
    setUrlQuery(query);
    setSearch(query);
  }

  const filtered = useMemo(() => {
    const rows = hospitals.filter((hospital) => {
      const matchesSearch = includesQuery([hospital.name, hospital.id, hospital.code, hospital.city], search);
      const matchesStatus = filters.status === "All" || hospital.status === filters.status;
      const matchesPlan = filters.plan === "All" || hospital.plan === filters.plan;
      const matchesFrom = !filters.from || hospital.registeredAt >= filters.from;
      const matchesTo = !filters.to || hospital.registeredAt <= filters.to;
      return matchesSearch && matchesStatus && matchesPlan && matchesFrom && matchesTo;
    }).map((hospital) => ({ ...hospital, location: `${hospital.city}, ${hospital.state}` }));
    return sortRows(rows, sortKey, sortDirection);
  }, [filters, hospitals, search, sortDirection, sortKey]);

  const pagination = usePagination(filtered, 10, `${search}|${filters.status}|${filters.plan}|${filters.from}|${filters.to}|${sortKey}|${sortDirection}`);

  const planNames = [...new Set(hospitals.map((hospital) => hospital.plan))];

  const askStatus = (ids, status) => {
    setConfirm({
      ids,
      status,
      title: status === "Suspended" ? "Suspend tenant" : "Activate tenant",
      message: status === "Suspended"
        ? "This marks the selected demonstration tenant as suspended. No hospital system will be contacted."
        : "This marks the selected demonstration tenant as active again. No provisioning will run.",
    });
  };

  const saveEdit = () => {
    const plan = plans.find((item) => item.name === editing.plan);
    const trial = editing.subscriptionStatus === "Trial";
    const pricing = priceFor(plan, editing.billingCycle, trial);
    updateHospital(editing.id, {
      ...editing,
      userLimit: plan?.userLimit || editing.userLimit,
      storageLimitGb: plan?.storageLimitGb || editing.storageLimitGb,
      amount: pricing.amount,
      monthlyRecurring: editing.status === "Active" && !trial ? pricing.monthlyRecurring : 0,
    });
    setEditing(null);
    push("Hospital details updated in the demonstration data.", "success");
  };

  return (
    <section className="hospitals-page">
      <PageHeader
        actions={<Button onClick={() => navigate(platformPath("/hospitals/register"))}>Register Hospital</Button>}
      />
      <section className="hospitals-panel">
        <div className="hospitals-toolbar">
          <SearchBar id="hospital-search" value={search} onChange={setSearch} placeholder="Name, tenant ID, or code" />
          <Select label="Status" value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
            {["All", "Active", "Suspended", "Closed"].map((status) => <option key={status}>{status}</option>)}
          </Select>
          <Select label="Plan" value={filters.plan} onChange={(event) => setFilters({ ...filters, plan: event.target.value })}>
            <option>All</option>
            {planNames.map((plan) => <option key={plan}>{plan}</option>)}
          </Select>
          <Input label="Registered from" type="date" value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value })} />
          <Input label="Registered to" type="date" value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value })} />
          <Button variant="secondary" onClick={() => { setFilters(emptyFilters); setSearch(""); }}>Reset</Button>
        </div>
        <div className="hospitals-meta">
          <span>{filtered.length} hospital{filtered.length === 1 ? "" : "s"} found</span>
          <span>Sorted by {sortKey} ({sortDirection})</span>
        </div>
        {selected.length > 0 && (
          <div className="bulk-bar">
            <strong>{selected.length} selected</strong>
            <div className="cluster">
              <Button size="sm" variant="secondary" onClick={() => askStatus(selected, "Suspended")}>Suspend selected</Button>
              <Button size="sm" onClick={() => askStatus(selected, "Active")}>Reactivate selected</Button>
            </div>
          </div>
        )}
        <div className="hospitals-table-wrap">
          <DataTable
            selectable
            selected={selected}
            onToggle={(id, checked) => setSelected((current) => checked ? [...current, id] : current.filter((item) => item !== id))}
            onToggleAll={(checked, ids) => setSelected(checked ? [...new Set([...selected, ...ids])] : selected.filter((id) => !ids.includes(id)))}
            sortKey={sortKey}
            sortDirection={sortDirection}
            onSort={(key) => {
              if (sortKey === key) setSortDirection((direction) => direction === "asc" ? "desc" : "asc");
              else { setSortKey(key); setSortDirection("asc"); }
            }}
            rows={pagination.rows}
            emptyTitle="No hospitals match"
            emptyMessage="Adjust the search or filters to see tenants."
            columns={[
              {
                key: "name",
                label: "Hospital Name",
                sortable: true,
                render: (row) => <span className="hospital-name">{row.name}</span>,
              },
              {
                key: "id",
                label: "Tenant ID",
                sortable: true,
                render: (row) => <span className="tenant-id">{row.id}</span>,
              },
              { key: "location", label: "Location", sortable: true },
              { key: "contactPerson", label: "Contact Person", sortable: true },
              { key: "plan", label: "Plan", sortable: true },
              {
                key: "status",
                label: "Status",
                sortable: true,
                render: (row) => <StatusChip status={row.status} />,
              },
              {
                key: "registeredAt",
                label: "Registered",
                sortable: true,
                render: (row) => formatDate(row.registeredAt),
              },
              {
                key: "renewalDate",
                label: "Renewal",
                sortable: true,
                render: (row) => formatDate(row.renewalDate),
              },
              {
                key: "actions",
                label: "Actions",
                render: (row) => (
                  <div className="row-actions">
                    <button type="button" className="action-link" onClick={() => navigate(`${PLATFORM_BASE}/hospitals/${row.id}`)}>View</button>
                    <button type="button" className="action-link" onClick={() => setEditing({ ...row })}>Edit</button>
                    {row.status === "Active" && (
                      <button type="button" className="action-link danger" onClick={() => askStatus([row.id], "Suspended")}>Suspend</button>
                    )}
                    {row.status === "Suspended" && (
                      <button type="button" className="action-link" onClick={() => askStatus([row.id], "Active")}>Reactivate</button>
                    )}
                    <button type="button" className="action-link" onClick={() => navigate(`${PLATFORM_BASE}/billing/subscriptions?q=${encodeURIComponent(row.name)}`)}>Subscription</button>                  </div>
                ),
              },
            ]}
          />
        </div>
        <Pagination {...pagination} onPageChange={pagination.setPage} />
      </section>
      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.title || ""}
        message={confirm?.message || ""}
        confirmLabel={confirm?.status === "Suspended" ? "Suspend" : "Activate"}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          setHospitalStatus(confirm.ids, confirm.status);
          setSelected([]);
          setConfirm(null);
          push("Tenant status updated in demonstration data.", "success");
        }}
      />
      <Modal
        open={Boolean(editing)}
        title="Edit hospital"
        subtitle="Updates the local demonstration record only."
        onClose={() => setEditing(null)}
        size="lg"
        footer={<><Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button><Button onClick={saveEdit}>Save changes</Button></>}
      >
        {editing && (
          <div className="form-grid">
            <Input label="Hospital name" value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })} />
            <Input label="Email" value={editing.email} onChange={(event) => setEditing({ ...editing, email: event.target.value })} />
            <Input label="Phone" value={editing.phone} onChange={(event) => setEditing({ ...editing, phone: event.target.value })} />
            <Input label="City" value={editing.city} onChange={(event) => setEditing({ ...editing, city: event.target.value })} />
            <Input className="span-2" label="Address" value={editing.address} onChange={(event) => setEditing({ ...editing, address: event.target.value })} />
            <Input label="State" value={editing.state} onChange={(event) => setEditing({ ...editing, state: event.target.value })} />
            <Input label="Postal code" value={editing.postalCode} onChange={(event) => setEditing({ ...editing, postalCode: event.target.value })} />
            <Input label="Administrator" value={editing.adminName} onChange={(event) => setEditing({ ...editing, adminName: event.target.value })} />
            <Input label="Administrator email" value={editing.adminEmail} onChange={(event) => setEditing({ ...editing, adminEmail: event.target.value })} />
            <Select label="Plan" value={editing.plan} onChange={(event) => setEditing({ ...editing, plan: event.target.value })}>
              {plans.map((plan) => <option key={plan.id}>{plan.name}</option>)}
            </Select>
            <Select label="Billing cycle" value={editing.billingCycle} onChange={(event) => setEditing({ ...editing, billingCycle: event.target.value })}>
              {billingCycles.map((cycle) => <option key={cycle}>{cycle}</option>)}
            </Select>
          </div>
        )}
      </Modal>
    </section>
  );
}
