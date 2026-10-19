import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  PLAN_NAMES,
} from "../../../shared/data/catalog";
import {
  agreeLead,
  addLeadNote,
  claimLead,
  closeLead,
  createLead,
  listLeads,
  logLeadContact,
  mapLead,
  mapLeadList,
  reopenLead,
  scheduleLeadFollowUp,
  updateLead,
  leadUpdateBody,
} from "../../../shared/api/leadApi";
import { usePlatform } from "../../../shared/context/PlatformContext";
import { useToast } from "../../../shared/hooks/useToast";
import { crmPath } from "../../../shared/paths";
import { todayInput } from "../../../shared/utils/formatDate";
import Button from "../../../shared/components/Button";
import AddLeadForm from "../components/AddLeadForm";
import { CLAIM_LIMIT, isUnclaimed } from "../utils/crmLeads";
import { AgreeDialog, CloseDialog, ContactDialog, EditLeadDialog, ReopenDialog, ScheduleDialog } from "./CrmDialogs";
import { WorkspaceContext } from "./workspace-context";

const BLOCKED = "This lead can't be changed. It may have been reassigned or its status has changed.";

function sameId(left, right) {
  return String(left) === String(right);
}

function conflictMatches(detail) {
  const matches = Array.isArray(detail?.matches) ? detail.matches : [];
  return {
    leads: matches.filter((item) => item.kind === "lead").map((item, index) => ({
      id: item.id ?? `hidden-${index}`,
      mine: item.visibility === "mine",
      unclaimed: item.visibility === "unclaimed",
      name: item.name || "",
      contact: "",
      phone: "",
      status: item.status || "",
      owner: item.visibility === "mine" ? "You" : item.visibility === "unclaimed" ? "Unassigned" : "Another team member",
      reasons: item.reasons || [],
    })),
    hospitals: matches.filter((item) => item.kind === "hospital").map((item) => ({
      id: item.id,
      name: item.name || "Registered hospital",
      city: item.city || "",
      reasons: item.reasons || [],
    })),
  };
}

/** Holds the signed-in employee's leads plus the dialogs every CRM page shares. */
export default function CrmWorkspace({ children }) {
  const { crmSession, signOutPortal } = usePlatform();
  const { push } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const me = crmSession?.name || "";
  const today = todayInput();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [dialog, setDialog] = useState(null);
  const [adding, setAdding] = useState(false);

  const remember = useCallback((lead) => {
    const mapped = mapLead(lead, crmSession);
    setRows((current) => [mapped, ...current.filter((item) => !sameId(item.id, mapped.id))]);
    return mapped;
  }, [crmSession]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const body = await listLeads();
      setRows(mapLeadList(body, crmSession));
    } catch (error) {
      setRows([]);
      setLoadError(error?.message || "Leads could not be loaded.");
      if (error?.status === 401 && error?.code !== "missing_token") signOutPortal("crm");
    } finally {
      setLoading(false);
    }
  }, [crmSession, signOutPortal]);

  useEffect(() => {
    load();
  }, [load]);

  const leads = useMemo(() => rows.filter((lead) => lead.assignedTo === me), [rows, me]);
  const pool = useMemo(() => rows.filter(isUnclaimed).sort((a, b) => String(b.submittedAt).localeCompare(String(a.submittedAt))), [rows]);
  const uncontacted = leads.filter((lead) => lead.status === "New").length;
  const planOptions = PLAN_NAMES;
  const find = (id) => rows.find((lead) => sameId(lead.id, id)) || null;
  const dialogLead = dialog ? find(dialog.id) : null;

  const fail = (error) => {
    if (error?.status === 401 && error?.code !== "missing_token") signOutPortal("crm");
    push(error?.message || BLOCKED, "error");
    return null;
  };

  const apply = async (request) => {
    try {
      return remember(await request());
    } catch (error) {
      return fail(error);
    }
  };

  const openLead = (id, { replace = false } = {}) => {
    navigate(crmPath(`/leads/${encodeURIComponent(id)}`), {
      replace,
      state: replace ? undefined : { from: `${location.pathname}${location.search}` },
    });
  };

  const claim = async (lead) => {
    if (uncontacted >= CLAIM_LIMIT) {
      push(`You already have ${CLAIM_LIMIT} new leads you haven't contacted. Contact one of them before claiming more.`, "error");
      return false;
    }
    const saved = await apply(() => claimLead(lead.id));
    if (!saved) return false;
    push(`${saved.hospitalName} is now yours. Contact details are unlocked.`, "success");
    openLead(saved.id);
    return true;
  };

  const actions = {
    openLead,
    claim,
    logContact: (lead, mode = "log") => setDialog({ type: "contact", id: lead.id, mode }),
    schedule: (lead) => setDialog({ type: "schedule", id: lead.id }),
    agree: (lead) => setDialog({ type: "agree", id: lead.id }),
    close: (lead) => setDialog({ type: "close", id: lead.id }),
    reopen: (lead) => setDialog({ type: "reopen", id: lead.id }),
    edit: (lead) => setDialog({ type: "edit", id: lead.id }),
    addLead: () => setAdding(true),
    note: async (lead, text) => {
      const saved = await apply(() => addLeadNote(lead.id, text));
      if (saved) push("Note added.", "success");
      return Boolean(saved);
    },
  };

  const saveContact = async (values) => {
    const lead = dialogLead;
    const closing = values.outcome === "not-interested";
    const saved = await apply(() => logLeadContact(lead.id, values));
    if (!saved) {
      setDialog(null);
      return;
    }
    push(closing ? `${saved.hospitalName} closed as not interested.` : `Contact logged for ${saved.hospitalName}.`, "success");
    if (values.outcome === "agreed") setDialog({ type: "agree", id: saved.id });
    else setDialog(null);
  };

  const finish = async (request, message) => {
    const saved = await apply(request);
    if (!saved) return;
    push(message(saved), "success");
    setDialog(null);
  };

  const value = {
    me,
    today,
    leads,
    pool,
    records: rows,
    uncontacted,
    hospitals: [],
    invoices: [],
    billingAvailable: false,
    scopeLabel: "Your assigned leads and unclaimed new enquiries. Other people's leads are not included.",
    loadError,
    reloadLeads: load,
    planOptions,
    actions,
  };

  if (loading && rows.length === 0) {
    return (
      <div className="crm-page">
        <section className="crm-card">
          <div className="crm-empty">
            <strong>Loading your leads</strong>
            <span>Fetching the leads assigned to you and unclaimed new enquiries.</span>
          </div>
        </section>
      </div>
    );
  }

  if (loadError && rows.length === 0) {
    return (
      <div className="crm-page">
        <section className="crm-card">
          <div className="crm-empty">
            <strong>Leads could not be loaded</strong>
            <span>{loadError}</span>
            <Button onClick={load}>Retry</Button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
      {dialogLead && dialog.type === "contact" && (
        <ContactDialog key={`${dialogLead.id}-contact`} lead={dialogLead} mode={dialog.mode} today={today} onCancel={() => setDialog(null)} onSubmit={saveContact} />
      )}
      {dialogLead && dialog.type === "schedule" && (
        <ScheduleDialog
          lead={dialogLead}
          today={today}
          onCancel={() => setDialog(null)}
          onSubmit={(values) => finish(
            () => scheduleLeadFollowUp(dialogLead.id, values),
            (saved) => `Follow-up ${saved.followUpDate ? "saved" : "scheduled"} for ${saved.hospitalName}.`,
          )}
        />
      )}
      {dialogLead && dialog.type === "agree" && (
        <AgreeDialog
          lead={dialogLead}
          planOptions={planOptions}
          onCancel={() => setDialog(null)}
          onSubmit={(values) => finish(
            () => agreeLead(dialogLead.id, values),
            (saved) => `${saved.hospitalName} sent to Accounts for registration.`,
          )}
        />
      )}
      {dialogLead && dialog.type === "close" && (
        <CloseDialog
          lead={dialogLead}
          onCancel={() => setDialog(null)}
          onSubmit={(values) => finish(
            () => closeLead(dialogLead.id, values),
            (saved) => `${saved.hospitalName} closed as not interested.`,
          )}
        />
      )}
      {dialogLead && dialog.type === "reopen" && (
        <ReopenDialog
          lead={dialogLead}
          onCancel={() => setDialog(null)}
          onConfirm={() => finish(
            () => reopenLead(dialogLead.id),
            (saved) => `${saved.hospitalName} reopened.`,
          )}
        />
      )}
      {dialogLead && dialog.type === "edit" && (
        <EditLeadDialog
          lead={dialogLead}
          planOptions={planOptions}
          onCancel={() => setDialog(null)}
          onSubmit={(values) => {
            if (!Object.keys(leadUpdateBody(dialogLead, values)).length) {
              push("Lead details saved.", "success");
              setDialog(null);
              return;
            }
            finish(
              () => updateLead(dialogLead.id, dialogLead, values),
              () => "Lead details saved.",
            );
          }}
        />
      )}
      {adding && (
        <AddLeadForm
          leads={rows}
          me={me}
          planOptions={planOptions}
          onClose={() => setAdding(false)}
          onOpenExisting={(id) => { setAdding(false); openLead(id); }}
          onClaim={(id) => {
            const lead = pool.find((item) => sameId(item.id, id));
            if (lead) claim(lead).then((ok) => { if (ok) setAdding(false); });
          }}
          hospitals={[]}
          onCreate={async (input, { shared, allowDuplicate }) => {
            try {
              const created = remember(await createLead(input, { shared, allowDuplicate }));
              setAdding(false);
              if (shared) {
                push(`${created.hospitalName} added to New enquiries for the team to claim.`, "success");
                navigate(`${crmPath("/leads")}?tab=New`);
                return created;
              }
              push(`${created.hospitalName} added as a new lead.`, "success");
              openLead(created.id);
              return created;
            } catch (error) {
              if (error?.status === 401 && error?.code !== "missing_token") signOutPortal("crm");
              if (error?.status === 409 && error?.detail?.matches) {
                const duplicate = new Error(error.message);
                duplicate.matches = conflictMatches(error.detail);
                throw duplicate;
              }
              throw error;
            }
          }}
        />
      )}
    </WorkspaceContext.Provider>
  );
}
